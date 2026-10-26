"""Workspace members must share data directories without depending on launch CWD."""

from pathlib import Path

from brh_core.config import Settings


def test_workspace_and_env_roots_resolve_the_same_paths(tmp_path, monkeypatch):
    (tmp_path / "pyproject.toml").write_text('[tool.uv.workspace]\nmembers=[]\n')
    member = tmp_path / "services" / "agent"
    member.mkdir(parents=True)
    for directory in (tmp_path, member):
        monkeypatch.chdir(directory)
        settings = Settings(_env_file=None)
        assert settings.ocr_dir == tmp_path / "data/ocr"
        assert settings.publication_dir == tmp_path / "data/published"
    (tmp_path / ".env").touch()
    assert Settings(_env_file=None).raw_dir == tmp_path / "data/raw"


def test_explicit_data_root_and_absolute_paths(tmp_path, monkeypatch):
    monkeypatch.setenv("BRH_DATA_ROOT", str(tmp_path))
    settings = Settings(_env_file=None, raw_dir=Path("/opt/raw"), ocr_dir=Path("ocr"))
    assert settings.ocr_dir == tmp_path / "ocr"
    assert settings.raw_dir == Path("/opt/raw")


def test_standalone_without_env_or_workspace_uses_cwd(tmp_path, monkeypatch):
    monkeypatch.delenv("BRH_DATA_ROOT", raising=False)
    monkeypatch.chdir(tmp_path)
    assert Settings(_env_file=None).ocr_dir == tmp_path / "data/ocr"
