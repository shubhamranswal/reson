from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.incident.engine import IncidentEngine
from app.incident.store import incident_store


router = APIRouter(
    prefix="/api/incidents",
    tags=["incident-events"],
)


class EventRequest(BaseModel):
    type: Literal["fact", "hypothesis", "action"]
    text: str
    owner: str | None = None


@router.post("/events")
def add_event(event: EventRequest):
    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    if event.type == "fact":
        result = engine.add_fact(event.text)

    elif event.type == "hypothesis":
        result = engine.add_hypothesis(event.text)

    else:
        result = engine.add_action(
            description=event.text,
            owner=event.owner,
        )

    return result