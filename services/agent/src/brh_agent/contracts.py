"""Immutable contracts for bounded agent planning and publication."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Record(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class EvidenceGoal(Record):
    goal_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,40}$")
    objective: str = Field(min_length=1, max_length=1500)
    queries: list[str] = Field(min_length=1, max_length=2)
    dependencies: list[str] = Field(max_length=3)


class TaskPlan(Record):
    standalone_question: str = Field(min_length=1, max_length=4000)
    intent: Literal[
        "conversation",
        "factual_lookup",
        "explanation",
        "comparison",
        "trend",
        "synthesis",
        "document_discovery",
        "relationship_exploration",
        "numerical_analysis",
        "out_of_scope",
    ]
    mode: Literal["conversation", "clarify", "direct", "decomposed", "out_of_scope"]
    constraints: list[str] = Field(max_length=30)
    clarification: str = Field(max_length=1000)
    goals: list[EvidenceGoal] = Field(max_length=4)

    @model_validator(mode="after")
    def validate_goals(self):
        ids = [goal.goal_id for goal in self.goals]
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate goal IDs")
        if self.mode == "direct" and len(ids) != 1:
            raise ValueError("Direct research requires exactly one goal")
        if self.mode == "decomposed" and len(ids) < 2:
            raise ValueError("Decomposed research requires at least two goals")
        if self.mode in {"conversation", "clarify", "out_of_scope"} and ids:
            raise ValueError("Non-research modes cannot contain goals")
        if self.mode == "clarify" and not self.clarification.strip():
            raise ValueError("Clarification requires a focused question")
        completed = set()
        for _ in ids:
            for goal in self.goals:
                if set(goal.dependencies) <= completed:
                    completed.add(goal.goal_id)
        if completed != set(ids):
            raise ValueError("Unknown or cyclic dependencies")
        for goal in self.goals:
            normalized = [query.strip().casefold() for query in goal.queries]
            if not all(normalized) or len(set(normalized)) != len(normalized):
                raise ValueError("Blank or duplicate queries")
            if any(len(query) > 2000 for query in goal.queries):
                raise ValueError("Query too long")
        return self


class AnswerParagraph(Record):
    text: str = Field(min_length=1, max_length=4000)
    evidence_ids: list[str] = Field(min_length=1, max_length=12)


class AnswerDraft(Record):
    paragraphs: list[AnswerParagraph] = Field(min_length=1, max_length=8)


class QueryRefinement(Record):
    goals: list[EvidenceGoal] = Field(min_length=1, max_length=4)
