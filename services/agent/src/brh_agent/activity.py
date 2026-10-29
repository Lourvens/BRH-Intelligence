"""User-facing activity events, separate from model drafts and tracing."""

from langgraph.config import get_stream_writer


def emit_activity(state, stage, status, *, event_id=None, **details):
    get_stream_writer()(
        {
            "type": "brh.activity",
            "turn_id": state["turn_id"],
            "id": event_id or f"{stage}:{state.get('model_calls', 0)}",
            "stage": stage,
            "status": status,
            **details,
        }
    )
