import os

from app.models.incident import IncidentRoom, IncidentState, Participant, Severity


class IncidentStore:
    def __init__(self):
        self._incidents: dict[str, IncidentState] = {}
        self._active_incident_id: str | None = None


    def get_or_create_room(self, incident_id: str) -> IncidentRoom:
        incident = self.get_incident(incident_id)

        if incident.room is None:
            incident.room = IncidentRoom(
                channel=f"incident-{incident.id}"
            )

        return incident.room
    
    def add_participant(
        self,
        incident_id: str,
        name: str,
        role: str = "participant",
        agora_uid: str | None = None,
    ) -> Participant:
        room = self.get_or_create_room(incident_id)

        existing = next(
            (
                p
                for p in room.participants
                if p.agora_uid == agora_uid
            ),
            None,
        )

        if existing:
            existing.name = name
            existing.role = role
            return existing

        participant = Participant(
            id=f"participant-{agora_uid}",
            name=name,
            role=role,
            agora_uid=agora_uid,
        )

        room.participants.append(participant)
        return participant
    
    def remove_participant(
        self,
        incident_id: str,
        agora_uid: str,
    ) -> None:
        room = self.get_or_create_room(incident_id)

        room.participants = [
            p
            for p in room.participants
            if p.agora_uid != agora_uid
        ]

    def get_active_incident(self) -> IncidentState:
        if self._active_incident_id is None:
            raise ValueError("No active incident selected.")

        incident = self.get_incident(self._active_incident_id)

        return incident

    def create_incident(
        self,
        title: str,
        severity: Severity,
        opened_by: str | None = None,
    ) -> IncidentState:
        next_number = len(self._incidents) + 1
        
        incident = IncidentState(
            id=f"INC-{next_number:03d}",
            title=title,
            severity=severity,
            opened_by=opened_by,
        )

        self._incidents[incident.id] = incident
        self._active_incident_id = incident.id

        return incident
    
    def add_incident(self, incident: IncidentState) -> IncidentState:
        """Register an existing incident in the store."""

        if incident.id in self._incidents:
            raise ValueError(f"Incident already exists: {incident.id}")

        self._incidents[incident.id] = incident

        if self._active_incident_id is None:
            self._active_incident_id = incident.id

        return incident

    def get_incident(self, incident_id: str) -> IncidentState:
        try:
            return self._incidents[incident_id]
        except KeyError:
            raise ValueError(f"Incident not found: {incident_id}")

    def switch_incident(self, incident_id: str) -> IncidentState:
        incident = self.get_incident(incident_id)
        self._active_incident_id = incident.id
        return incident

    def list_incidents(self) -> list[IncidentState]:
        return list(self._incidents.values())


incident_store = IncidentStore()

incident_store.add_incident(
    IncidentState(
        id="INC-001",
        title="Payment Service Outage",
        severity=Severity.SEV1,
        opened_by="system",
    )
)
