from fastapi import APIRouter
from pydantic import BaseModel

from app.incident.store import incident_store


router = APIRouter(prefix="/api/rooms", tags=["rooms"])


class JoinRoomRequest(BaseModel):
    incident_id: str
    name: str


@router.post("/join")
def join_room(request: JoinRoomRequest):
    incident = incident_store.get_incident(request.incident_id)

    room = incident_store.get_or_create_room(request.incident_id)

    participant = incident_store.add_participant(
        incident_id=request.incident_id,
        name=request.name,
    )

    return {
        "incident_id": incident.id,
        "channel": room.channel,
        "participant": participant.model_dump(mode="json"),
        "agent_started": room.agent_id is not None,
    }