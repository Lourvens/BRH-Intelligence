"""Driver for notebook 0006; not imported by any shipped package.

Run from the repository root with ``uv run python experiments/research-graph/run.py``.
Preparation/scoring are offline. Network requests require --allow-paid.
"""

import argparse
import hashlib
import json
import random
from pydantic import ValidationError
from collections import defaultdict
from pathlib import Path

from brh_core.config import get_settings
from brh_core.corpus.artifacts import ArtifactStore, artifact_hash
from brh_core.corpus.evidence import validate_proposal
from brh_core.corpus.extraction_models import PROMPT_VERSION
from brh_core.corpus.metadata import normalize
from brh_core.corpus.providers import OpenRouterGraphClient

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent
MODELS = ('qwen/qwen3.5-flash-02-23', 'google/gemini-2.5-flash-lite',
          'mistralai/ministral-8b-2512')
SEEDS = (17, 41, 97)
THRESHOLDS = (0.8, 0.9, 0.95, 0.98)


def write(path, value):
    staging = path.with_suffix(path.suffix + '.tmp')
    staging.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    staging.replace(path)


def prepare():
    path = OUT / 'manifest.json'
    if path.exists():
        raise SystemExit('Manifest already exists; preserve reviewed labels rather than overwriting.')
    buckets = defaultdict(list)
    store = ArtifactStore(ROOT / 'data/ocr')
    for file in sorted((ROOT / 'data/ocr').glob('*/document.md')):
        artifact = store.document(file.parent.name)
        digest = artifact_hash(file)
        for page in artifact.read_pages():
            if not 300 <= len(page.text) <= 12000:
                continue
            family = ('table' if '<table' in page.text or '| ---' in page.text else
                      'regulation' if 'circulaire' in page.text.lower() else 'prose')
            buckets[family].append({'sha256': artifact.sha256, 'artifact_hash': digest,
                                   'page': page.page_number, 'family': family})
    rng = random.Random(SEEDS[0])
    pages = []
    for family in ('prose', 'table', 'regulation'):
        for row in rng.sample(buckets[family], min(10, len(buckets[family]))):
            pages.append({**row, 'reviewed_by': '', 'expected_entities': [],
                          'expected_relationships': []})
    write(path, {'question': 'Which inexpensive LLM + Jev meets page-grounded French extraction gates?',
                 'selection_seed': SEEDS[0], 'repetition_seeds': SEEDS,
                 'decision_rule': 'At least 30 reviewed pages; entity recall >= .80; accepted '
                 'relationship precision >= .95 in every family; structural evidence validity '
                 '100%; choose lowest observed cost among eligible model/threshold pairs. '
                 'No winner without human sign-off.', 'pages': pages})
    write(OUT / 'results.json', {'runs': [], 'status': 'not_run'})


def run(smoke=False, selected_model=None):
    manifest = json.loads((OUT / 'manifest.json').read_text())
    target = OUT / ('protocol-smoke.json' if smoke else 'results.json')
    output = json.loads(target.read_text()) if target.exists() else {'runs': []}
    known = {row['key'] for row in output['runs'] if row['status'] == 'succeeded'}
    settings = get_settings()
    store = ArtifactStore(ROOT / 'data/ocr')
    pages = manifest['pages'][:1] if smoke else manifest['pages']
    models = (selected_model,) if selected_model else (MODELS[:1] if smoke else MODELS)
    for model in models:
        for seed in SEEDS[:1] if smoke else SEEDS:
            client = OpenRouterGraphClient(settings.openrouter_embedding_api_key.get_secret_value(),
                                          model, 'typesafe/jev-1.14', seed=seed)
            try:
                for row in pages:
                    identity = json.dumps([row['sha256'], row['artifact_hash'], row['page'],
                                           model, seed, PROMPT_VERSION])
                    key = hashlib.sha256(identity.encode()).hexdigest()
                    if key in known:
                        continue
                    record = {'key': key, 'model': model, 'seed': seed,
                              'prompt_version': PROMPT_VERSION, **row}
                    artifact = store.document(row['sha256'])
                    if artifact_hash(artifact.markdown) != row['artifact_hash']:
                        raise SystemExit('Artifact changed: review the manifest before rerunning.')
                    text = artifact.read_pages()[row['page'] - 1].text
                    try:
                        proposal, provenance = client.extract(text)
                        record.update(proposal=proposal.model_dump(mode='json'), extraction=provenance)
                        validate_proposal(proposal, text)
                        probabilities, judgment = client.judge(proposal, text)
                        record.update(status='succeeded', probabilities=probabilities,
                                      validation=judgment, structural_evidence_valid=True)
                    except Exception as exc:
                        record.update(status='failed', error=type(exc).__name__,
                                      structural_evidence_valid=False)
                        record.setdefault('extraction', client.last_provenance)
                        if getattr(client, 'last_error', None):
                            record['provider_error'] = client.last_error
                        if isinstance(exc, ValidationError):
                            record['schema_errors'] = exc.errors(include_input=False, include_url=False)
                            record['raw_output'] = client.last_output
                    output['runs'].append(record)
                    output['status'] = 'protocol_only' if smoke else 'unreviewed_until_scored'
                    write(target, output)
                    print(json.dumps({key: record[key] for key in ('model', 'seed', 'status')},
                                     ensure_ascii=False))
                    if record.get('error') == 'HTTPStatusError':
                        raise SystemExit('Provider rejected the request; inspect access/quota before retrying.')
            finally:
                client.close()


def score():
    manifest = json.loads((OUT / 'manifest.json').read_text())
    results = json.loads((OUT / 'results.json').read_text())
    gold = {(r['sha256'], r['page']): r for r in manifest['pages'] if r['reviewed_by'].strip()}
    metrics = []
    for model in MODELS:
        for seed in SEEDS:
            for threshold in THRESHOLDS:
                families = defaultdict(lambda: {'entity_tp': 0, 'entity_gold': 0,
                                                'entity_predicted': 0,
                                                'relation_tp': 0, 'relation_predicted': 0,
                                                'relation_gold': 0, 'alias_tp': 0,
                                                'alias_predicted': 0,
                                                'valid': 0, 'runs': 0, 'cost': 0.0})
                for row in results['runs']:
                    expected = gold.get((row['sha256'], row['page']))
                    if (row['model'] != model or row['seed'] != seed or not expected
                            or row.get('prompt_version') != PROMPT_VERSION):
                        continue
                    values = families[row['family']]
                    values['runs'] += 1
                    values['valid'] += int(row['structural_evidence_valid'])
                    for stage in ('extraction', 'validation'):
                        values['cost'] += row.get(stage, {}).get('usage', {}).get('cost', 0) or 0
                    predicted = row.get('proposal', {'entities': [], 'relationships': []})
                    expected_entities = {(e['kind'], normalize(e['label']))
                                         for e in expected['expected_entities']}
                    entities = {(e['kind'], normalize(e['label'])) for e in predicted['entities']}
                    values['entity_tp'] += len(entities & expected_entities)
                    values['entity_gold'] += len(expected_entities)
                    values['entity_predicted'] += len(entities)
                    expected_aliases = {(normalize(e['label']), normalize(alias))
                                        for e in expected['expected_entities']
                                        for alias in e.get('aliases', [])}
                    aliases = {(normalize(e['label']), normalize(alias))
                               for e in predicted['entities'] for alias in e.get('aliases', [])}
                    values['alias_tp'] += len(aliases & expected_aliases)
                    values['alias_predicted'] += len(aliases)
                    refs = {e['ref']: normalize(e['label']) for e in predicted['entities']}
                    expected_relations = {(normalize(r['subject']), r['predicate'],
                                           normalize(r['object']))
                                          for r in expected['expected_relationships']}
                    accepted = set()
                    for relation, probability in zip(predicted['relationships'],
                                                       row.get('probabilities', []), strict=False):
                        if probability >= threshold and row['structural_evidence_valid']:
                            accepted.add((refs[relation['subject']], relation['predicate'],
                                          refs[relation['object']]))
                    values['relation_tp'] += len(accepted & expected_relations)
                    values['relation_predicted'] += len(accepted)
                    values['relation_gold'] += len(expected_relations)
                for family, values in families.items():
                    metrics.append({'model': model, 'seed': seed, 'threshold': threshold,
                                    'family': family, **values,
                                    'entity_recall': values['entity_tp'] / max(values['entity_gold'], 1),
                                    'entity_precision': values['entity_tp'] /
                                    max(values['entity_predicted'], 1),
                                    'alias_precision': (values['alias_tp'] / values['alias_predicted']
                                                        if values['alias_predicted'] else 1),
                                    'relationship_precision': values['relation_tp'] /
                                    max(values['relation_predicted'], 1)})
    candidates, spread = [], []
    for model in MODELS:
        for threshold in THRESHOLDS:
            selected = [r for r in metrics if r['model'] == model and r['threshold'] == threshold]
            seed_recall, seed_precision = [], []
            for seed in SEEDS:
                trial = [r for r in selected if r['seed'] == seed]
                if trial:
                    seed_recall.append(sum(r['entity_tp'] for r in trial) /
                                       max(sum(r['entity_gold'] for r in trial), 1))
                    seed_precision.append(sum(r['relation_tp'] for r in trial) /
                                          max(sum(r['relation_predicted'] for r in trial), 1))
            if seed_recall:
                spread.append({'model': model, 'threshold': threshold,
                               'entity_recall_min_max': [min(seed_recall), max(seed_recall)],
                               'relationship_precision_min_max':
                               [min(seed_precision), max(seed_precision)]})
            if (len(gold) >= 30 and len(selected) == 9 and all(
                    r['valid'] == r['runs'] and r['runs'] >= 10 and r['entity_recall'] >= .8
                    and r['relationship_precision'] >= .95 and r['alias_precision'] >= .95
                    for r in selected)):
                candidates.append({'model': model, 'accept_probability': threshold,
                                   'observed_cost': sum(r['cost'] for r in selected)})
    recommendation = min(candidates, key=lambda r: (r['observed_cost'],r['accept_probability'])) \
        if candidates else None
    write(OUT / 'scores.json', {'reviewed_pages': len(gold), 'metrics': metrics,
                               'spread': spread, 'prompt_version': PROMPT_VERSION,
                               'recommendation': recommendation, 'human_sign_off_required': True})
    (OUT / 'REPORT.md').write_text(
        '# Research graph extraction evaluation\n\n'
        f'Reviewed pages: {len(gold)} / {len(manifest["pages"])}. '
        f'Candidate runs: {len(results["runs"])}.\n\n'
        'No production model or probability threshold is approved by this report. '
        'Protocol smoke results are recorded separately and do not establish quality. '
        'Review labels, run the three seeded trials, inspect family-specific precision/recall, '
        'alias mistakes, cost and variance, then sign off before supplying a production policy.\n\n'
        'Protocol observations: the initial Qwen endpoint returned a scalar instead of the '
        'requested object; a Ministral candidate failed exact source-evidence validation; '
        'the Gemini request was rejected upstream. A separate synthetic Jev support call '
        'succeeded with the shared key. These are transport/integrity observations, not a '
        'comparative quality score. Original outputs are preserved in the smoke artifacts.\n'
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=('prepare', 'run', 'score', 'smoke'))
    parser.add_argument('--allow-paid', action='store_true')
    parser.add_argument('--model', choices=MODELS)
    args = parser.parse_args()
    if args.action in {'run', 'smoke'} and not args.allow_paid:
        parser.error('Network calls require explicit --allow-paid')
    if args.action == 'prepare':
        prepare()
    elif args.action == 'score':
        score()
    else:
        run(smoke=args.action == 'smoke', selected_model=args.model)
