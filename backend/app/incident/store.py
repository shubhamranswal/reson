import os

from app.models.incident import IncidentState, Severity


class IncidentStore:
    def __init__(self):
        self._incidents: dict[str, IncidentState] = {}
        self._active_incident_id: str | None = None

        print(f"[STORE] Created store instance id={id(self)}")

    def get_active_incident(self) -> IncidentState:
        if self._active_incident_id is None:
            raise ValueError("No active incident selected.")

        incident = self.get_incident(self._active_incident_id)

        print(
            f"[STORE] instance={id(self)} "
            f"active={incident.id} "
            f"facts={len(incident.facts)} "
            f"hypotheses={len(incident.hypotheses)} "
            f"actions={len(incident.actions)} "
            f"decisions={len(incident.decisions)} "
            f"conflicts={len(incident.conflicts)}"
        )

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

        # We'll add opened_by to the model shortly.
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
