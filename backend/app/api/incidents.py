import socket
import os
from fastapi import APIRouter
from pydantic import BaseModel

from app.incident.store import incident_store
from app.models.incident import Severity


router = APIRouter(
    prefix="/api/incidents",
    tags=["incidents"],
)


class CreateIncidentRequest(BaseModel):
    title: str
    severity: Severity
    opened_by: str | None = None


class SwitchIncidentRequest(BaseModel):
    incident_id: str


@router.get("")
def list_incidents():
    return [
        incident.model_dump(mode="json")
        for incident in incident_store.list_incidents()
    ]


@router.post("")
def create_incident(request: CreateIncidentRequest):
    incident = incident_store.create_incident(
        title=request.title,
        severity=request.severity,
        opened_by=request.opened_by,
    )

    return incident.model_dump(mode="json")


@router.get("/current")
def current_incident():
    return incident_store.get_active_incident()

@router.get("/{incident_id}")
def get_incident(incident_id: str):
    incident = incident_store.get_incident(incident_id)
    return incident.model_dump(mode="json")


@router.post("/switch")
def switch_incident(request: SwitchIncidentRequest):
    incident = incident_store.switch_incident(request.incident_id)
    return incident.model_dump(mode="json")

