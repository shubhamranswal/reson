from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class IncidentStatus(str, Enum):
    INVESTIGATING = "investigating"
    MITIGATING = "mitigating"
    RECOVERING = "recovering"
    RESOLVED = "resolved"


class Severity(str, Enum):
    SEV1 = "SEV-1"
    SEV2 = "SEV-2"
    SEV3 = "SEV-3"


class Fact(BaseModel):
    id: str
    text: str
    source: str = "conversation"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HypothesisStatus(str, Enum):
    UNVERIFIED = "unverified"
    SUPPORTED = "supported"
    CONTRADICTED = "contradicted"


class Hypothesis(BaseModel):
    id: str
    text: str
    proposed_by: str | None = None
    status: HypothesisStatus = HypothesisStatus.UNVERIFIED
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ActionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class IncidentAction(BaseModel):
    id: str
    description: str
    owner: str | None = None
    status: ActionStatus = ActionStatus.PENDING
    requires_confirmation: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Decision(BaseModel):
    id: str
    text: str
    decided_by: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TimelineEvent(BaseModel):
    id: str
    type: str
    description: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Conflict(BaseModel):
    id: str
    description: str
    related_fact_ids: list[str] = Field(default_factory=list)
    related_hypothesis_ids: list[str] = Field(default_factory=list)
    resolved: bool = False


class Participant(BaseModel):
    id: str
    name: str
    role: str

class IncidentRoom(BaseModel):
    channel: str
    agent_id: str | None = None


class IncidentState(BaseModel):
    id: str
    title: str
    severity: Severity
    status: IncidentStatus = IncidentStatus.INVESTIGATING
    opened_by: str | None = None

    participants: list[Participant] = Field(default_factory=list)
    room: IncidentRoom | None = None
    facts: list[Fact] = Field(default_factory=list)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    decisions: list[Decision] = Field(default_factory=list)
    actions: list[IncidentAction] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    conflicts: list[Conflict] = Field(default_factory=list)