"""Build the assistant graph with the offline fakes every test expects."""

from graph import build_graph as create_graph
from support.fakes import TitleModel


def build_graph(**kwargs):
    kwargs.setdefault("title_model_factory", TitleModel)
    return create_graph(**kwargs)
