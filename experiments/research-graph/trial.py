"""Notebook 0007 driver: resumable, explicitly paid 5% persistence trial.

Uses shipped adapters; no shipped code imports this experiment. Output and
checkpoints are durable. Unreviewed relationships are never accepted.
"""

import argparse
import json
import math
import random
import threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

from brh_core.config import get_settings
from brh_core.corpus.evidence import validate_proposal
from brh_core.corpus.extraction import extract_document
from brh_core.corpus.extraction_models import ExtractionPolicy, ExtractionProposal, PROMPT_VERSION
from brh_core.corpus.providers import OpenRouterGraphClient
from brh_core.db.pool import open_pool
from brh_core.db.research_extraction import ResearchExtractionRepository
from brh_core.db.research_query import ResearchQueryRepository

OUT = Path(__file__).parent / 'five-percent'
LOCK = threading.Lock()
STOP = threading.Event()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


class TrialClient:
    """Record rejected candidates while persisting only exactly grounded evidence."""

    def __init__(self, key, model):
        self.client = OpenRouterGraphClient(key, model, 'typesafe/jev-1.14', seed=17)
        self.diagnostics = []

    def extract(self, text):
        proposal, provenance = self.client.extract(text)
        entities, relationships, rejected = [], [], []
        for entity in proposal.entities:
            try:
                validate_proposal(ExtractionProposal(entities=(entity,), relationships=()), text)
                if entity.ref in {e.ref for e in entities}:
                    raise ValueError('Duplicate reference')
                entities.append(entity)
            except ValueError as exc:
                rejected.append({'entity': entity.model_dump(mode='json'), 'error': str(exc)})
        for relationship in proposal.relationships:
            try:
                validate_proposal(ExtractionProposal(entities=entities,
                                                     relationships=(relationship,)), text)
                relationships.append(relationship)
            except ValueError as exc:
                rejected.append({'relationship': relationship.model_dump(mode='json'),
                                 'error': str(exc)})
        self.diagnostics.append({'extraction': provenance, 'rejected': rejected,
                                 'retained_entities': len(entities),
                                 'retained_relationships': len(relationships)})
        return ExtractionProposal(entities=entities, relationships=relationships), provenance

    def judge(self, proposal, text):
        probabilities, provenance = self.client.judge(proposal, text)
        self.diagnostics.append({'validation': provenance})
        return probabilities, provenance


def prepare(pool):
    path = OUT / 'manifest.json'
    if path.exists():
        return json.loads(path.read_text())
    with pool.connection() as conn:
        documents = conn.execute('''SELECT document_id::text,sha256,artifact_hash,slug,
            title,family,page_count FROM corpus.research_documents ORDER BY document_id''').fetchall()
    selected = random.Random(17).sample(documents, math.ceil(len(documents) * .05))
    manifest = {'question': 'Can grounded entities from 5% of documents be saved and resumed?',
                'decision_rule': 'Attempt all pages of the fixed sample; save only exact source '
                'evidence. Record rejected candidates, failures, cost and coverage. No factual '
                'precision/recall claim without reviewed labels; no production model selection.',
                'corpus_documents': len(documents), 'percentage': 5, 'seed': 17,
                'model': 'mistralai/ministral-8b-2512', 'prompt_version': PROMPT_VERSION,
                'documents': selected, 'pages': sum(d['page_count'] for d in selected),
                'families': dict(Counter(d['family'] for d in selected))}
    write(path, manifest)
    return manifest


def report(pool, manifest):
    ids = [d['document_id'] for d in manifest['documents']]
    with pool.connection() as conn:
        counts = conn.execute('''SELECT
            (SELECT count(DISTINCT entity_id) FROM corpus.research_mentions
                WHERE document_id=ANY(%s::uuid[])) entities,
            (SELECT count(*) FROM corpus.research_mentions
                WHERE document_id=ANY(%s::uuid[])) mentions,
            (SELECT count(*) FROM corpus.research_assertions
                WHERE document_id=ANY(%s::uuid[]) AND status='pending') pending_relationships,
            (SELECT count(DISTINCT document_id) FROM corpus.research_mentions
                WHERE document_id=ANY(%s::uuid[])) documents_with_entities''', [ids]*4).fetchone()
    rows = [json.loads(line) for line in (OUT / 'results.jsonl').read_text().splitlines()] \
        if (OUT / 'results.jsonl').exists() else []
    counts.update(sample_documents=len(ids), sample_pages=manifest['pages'],
                  attempted_pages=len({(r['document_id'],r['page']) for r in rows}),
                  failed_attempts=sum(r['status']=='failed' for r in rows),
                  observed_cost=sum(float(d.get(k,{}).get('usage',{}).get('cost',0) or 0)
                    for r in rows for d in r.get('diagnostics',[]) for k in ('extraction','validation')))
    write(OUT / 'summary.json', counts)
    return counts


def run_document(row, pool, policy, key):
    queries = ResearchQueryRepository(pool)
    document = queries.document(row['document_id'])
    if document.artifact_hash != row['artifact_hash']:
        raise ValueError('Sample changed; preserve manifest and review before rerunning')
    client = TrialClient(key, policy.model)
    try:
        saved = {}
        if (OUT / 'results.jsonl').exists():
            for line in (OUT / 'results.jsonl').read_text().splitlines():
                record = json.loads(line)
                if record['document_id'] == document.document_id:
                    saved[record['page']] = record
        for page in queries.pages(document.document_id):
            if STOP.is_set():
                return
            if saved.get(page['page_number'],{}).get('status') == 'succeeded':
                continue
            client.diagnostics = []
            result = {'document_id': document.document_id, 'page': page['page_number'],
                      'prompt_version': PROMPT_VERSION}
            try:
                counts = extract_document(document, [page], client=client,
                    repository=ResearchExtractionRepository(pool), policy=policy)
                result.update(status='succeeded', **counts)
            except Exception as exc:
                result.update(status='failed', error=type(exc).__name__)
                if isinstance(exc,httpx.HTTPStatusError) and exc.response.status_code in (401,402,403):
                    STOP.set()
            result['diagnostics'] = client.diagnostics
            with LOCK:
                with (OUT / 'results.jsonl').open('a') as handle:
                    handle.write(json.dumps(result, ensure_ascii=False) + '\n')
                    handle.flush()
                print(json.dumps({k:v for k,v in result.items() if k!='diagnostics'}), flush=True)
    finally:
        client.client.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--allow-paid', action='store_true')
    parser.add_argument('--report', action='store_true')
    args = parser.parse_args()
    settings = get_settings()
    with open_pool(settings) as pool:
        manifest = prepare(pool)
        if args.report:
            print(json.dumps(report(pool,manifest)))
            return
        if not args.allow_paid:
            print(json.dumps({'prepared_documents':len(manifest['documents']), 'pages':manifest['pages']}))
            return
        policy = ExtractionPolicy(model=manifest['model'], accept_probability=.95,
            reject_probability=.2, evaluation_reference='notebook-0007-five-percent-trial')
        assert not policy.approved
        key = settings.openrouter_embedding_api_key.get_secret_value()
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(run_document,row,pool,policy,key) for row in manifest['documents']]
            for future in futures:
                future.result()
        print(json.dumps(report(pool,manifest)),flush=True)


if __name__ == '__main__':
    main()
