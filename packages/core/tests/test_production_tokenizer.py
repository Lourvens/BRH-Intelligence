"""Production counters preserve model formatting and disable truncation."""

import pytest
from brh_core.config import Settings
from brh_core.ingestion.tokenizer import production_counter
from tokenizers import Tokenizer, models, pre_tokenizers, processors


@pytest.fixture
def tokenizer_file(tmp_path, monkeypatch):
    tokenizer = Tokenizer(
        models.WordLevel(
            {"[UNK]": 0, "passage": 1, ":": 2, "bonjour": 3, "[EOS]": 4}, unk_token="[UNK]"
        )
    )
    tokenizer.pre_tokenizer = pre_tokenizers.Whitespace()
    tokenizer.post_processor = processors.TemplateProcessing(
        single="$A [EOS]", special_tokens=[("[EOS]", 4)]
    )
    tokenizer.enable_truncation(max_length=3)
    path = tmp_path / "tokenizer.json"
    tokenizer.save(str(path))
    monkeypatch.setattr("huggingface_hub.hf_hub_download", lambda *args, **kwargs: str(path))


def test_qwen_raw_count_includes_specials_without_truncation(tokenizer_file):
    settings = Settings(
        _env_file=None,
        embedding_model="qwen/qwen3-embedding-8b",
        embedding_tokenizer="Qwen/Qwen3-Embedding-8B",
    )
    identity, count = production_counter(settings)
    assert identity.startswith("qwen-raw-specials-v1:")
    assert count("bonjour") == count("bonjour") == 2
    assert count("bonjour " * 20) == 21


def test_legacy_e5_passage_contract_stays_distinct(tokenizer_file):
    identity, count = production_counter(Settings(_env_file=None))
    assert identity.startswith("e5-passage:")
    assert count("bonjour") == 4


def test_model_tokenizer_mismatch_fails_before_download():
    with pytest.raises(ValueError, match="requires tokenizer"):
        production_counter(Settings(_env_file=None, embedding_model="qwen/qwen3-embedding-8b"))
