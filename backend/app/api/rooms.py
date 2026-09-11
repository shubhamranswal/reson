from fastapi import APIRouter
from pydantic import BaseModel

from app.incident.store import incident_store


router = APIRouter(prefix="/api/rooms", tags=["rooms"])


class JoinRoomRequest(BaseModel):
    incident_id: str
    name: str
    agora_uid: str
    role: str = "participant"


class SetAgentRequest(BaseModel):
    agent_id: str


class LeaveRoomRequest(BaseModel):
    incident_id: str
    agora_uid: str


@router.get("/{incident_id}")
def get_room(incident_id: str):
    incident = incident_store.get_incident(incident_id)
    room = incident_store.get_or_create_room(incident_id)

    return {
        "incident_id": incident.id,
        "channel": room.channel,
        "participants": [
            p.model_dump(mode="json")
            for p in incident.participants
        ],
        "agent_id": room.agent_id,
        "agent_started": room.agent_id is not None,
    }

@router.post("/join")
def join_room(request: JoinRoomRequest):
    incident = incident_store.get_incident(request.incident_id)

    room = incident_store.get_or_create_room(request.incident_id)

    participant = incident_store.add_participant(
        incident_id=request.incident_id,
        name=request.name,
        role=request.role,
        agora_uid=request.agora_uid,
    )

    return {
        "incident_id": incident.id,
        "channel": room.channel,
        "participant": participant.model_dump(mode="json"),
        "agent_started": room.agent_id is not None,
        "participants": [
            p.model_dump(mode="json")
            for p in incident.participants
        ],
        "agent_id": room.agent_id,
    }

@router.delete("/{incident_id}/agent")
def clear_room_agent(incident_id: str):
    room = incident_store.get_or_create_room(incident_id)

    room.agent_id = None

    return {
        "incident_id": incident_id,
        "agent_id": None,
        "agent_started": False,
    }

@router.put("/{incident_id}/agent")
def set_room_agent(
    incident_id: str,
    request: SetAgentRequest,
):
    room = incident_store.get_or_create_room(incident_id)

    room.agent_id = request.agent_id

    return {
        "incident_id": incident_id,
        "agent_id": room.agent_id,
        "agent_started": True,
    }


@router.post("/leave")
def leave_room(request: LeaveRoomRequest):
    incident = incident_store.get_incident(request.incident_id)

    incident_store.remove_participant(
        incident_id=request.incident_id,
        agora_uid=request.agora_uid,
    )

    room = incident_store.get_or_create_room(request.incident_id)

    return {
        "incident_id": incident.id,
        "channel": room.channel,
        "participants": [
            p.model_dump(mode="json")
            for p in incident.participants
        ],
        "agent_id": room.agent_id,
        "agent_started": room.agent_id is not None,
    }