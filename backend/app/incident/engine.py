from uuid import uuid4

from app.models.incident import (
    Conflict,
    Decision,
    Fact,
    Hypothesis,
    HypothesisStatus,
    IncidentAction,
    IncidentState,
    IncidentStatus,
    TimelineEvent,
)


class IncidentEngine:
    def __init__(self, state: IncidentState):
        self.state = state

    def resolve_incident(self, reason: str | None = None) -> IncidentState:
        """Mark the active incident as resolved."""

        self.state.status = IncidentStatus.RESOLVED

        description = "Incident marked as resolved."

        if reason:
            description += f" Resolution: {reason}"

        self.state.timeline.append(
            TimelineEvent(
                id=str(uuid4()),
                type="status_change",
                description=description,
            )
        )

        return self.state

    def add_fact(
        self,
        text: str,
        source: str = "conversation",
    ) -> Fact:
        fact = Fact(
            id=str(uuid4()),
            text=text,
            source=source,
        )

        self.state.facts.append(fact)

        self.state.timeline.append(
            TimelineEvent(
                id=str(uuid4()),
                type="fact",
                description=text,
            )
        )

        return fact

    def add_hypothesis(
        self,
        text: str,
        proposed_by: str | None = None,
    ) -> Hypothesis:
        hypothesis = Hypothesis(
            id=str(uuid4()),
            text=text,
            proposed_by=proposed_by,
        )

        self.state.hypotheses.append(hypothesis)

        self.state.timeline.append(
            TimelineEvent(
                id=str(uuid4()),
                type="hypothesis",
                description=text,
            )
        )

        return hypothesis
    

    def support_hypothesis(self, hypothesis_id: str) -> Hypothesis:
        for hypothesis in self.state.hypotheses:
            if hypothesis.id == hypothesis_id:
                if hypothesis.status != HypothesisStatus.UNVERIFIED:
                    raise ValueError(
                        f"Hypothesis {hypothesis_id} is already "
                        f"{hypothesis.status.value}."
                    )

                hypothesis.status = HypothesisStatus.SUPPORTED

                self.state.timeline.append(
                    TimelineEvent(
                        id=str(uuid4()),
                        type="hypothesis_supported",
                        description=(
                            f"Hypothesis {hypothesis_id} marked as supported."
                        ),
                    )
                )

                return hypothesis

        raise ValueError(f"Hypothesis not found: {hypothesis_id}")


    def contradict_hypothesis(self, hypothesis_id: str) -> Hypothesis:
        for hypothesis in self.state.hypotheses:
            if hypothesis.id == hypothesis_id:
                if hypothesis.status != HypothesisStatus.UNVERIFIED:
                    raise ValueError(
                        f"Hypothesis {hypothesis_id} is already "
                        f"{hypothesis.status.value}."
                    )

                hypothesis.status = HypothesisStatus.CONTRADICTED

                self.state.timeline.append(
                    TimelineEvent(
                        id=str(uuid4()),
                        type="hypothesis_contradicted",
                        description=(
                            f"Hypothesis {hypothesis_id} marked as contradicted."
                        ),
                    )
                )

                return hypothesis

        raise ValueError(f"Hypothesis not found: {hypothesis_id}")

    def add_action(
        self,
        description: str,
        owner: str | None = None,
        requires_confirmation: bool = False,
    ) -> IncidentAction:
        action = IncidentAction(
            id=str(uuid4()),
            description=description,
            owner=owner,
            requires_confirmation=requires_confirmation,
        )

        self.state.actions.append(action)

        self.state.timeline.append(
            TimelineEvent(
                id=str(uuid4()),
                type="action",
                description=description,
            )
        )

        return action

    def add_conflict(
        self,
        description: str,
        related_fact_ids: list[str] | None = None,
        related_hypothesis_ids: list[str] | None = None,
    ) -> Conflict:
        conflict = Conflict(
            id=str(uuid4()),
            description=description,
            related_fact_ids=related_fact_ids or [],
            related_hypothesis_ids=related_hypothesis_ids or [],
        )

        self.state.conflicts.append(conflict)

        self.state.timeline.append(
            TimelineEvent(
                id=str(uuid4()),
                type="conflict",
                description=description,
            )
        )

        return conflict
    
    def resolve_conflict(
        self,
        conflict_id: str,
    ) -> Conflict:
        """Mark an existing incident conflict as resolved."""

        for conflict in self.state.conflicts:
            if conflict.id == conflict_id:
                conflict.resolved = True
                self.state.timeline.append(
                    TimelineEvent(
                        id=str(uuid4()),
                        type="conflict_resolved",
                        description=f"Conflict {conflict_id} marked as resolved.",
                    )
                )
                return conflict

        raise ValueError(f"Conflict not found: {conflict_id}")
    
    def add_decision(
        self,
        text: str,
        decided_by: str | None = None,
    ) -> Decision:
        """Record a decision made during the incident."""

        decision = Decision(
            id=str(uuid4()),
            text=text,
            decided_by=decided_by,
        )

        self.state.decisions.append(decision)

        self.state.timeline.append(
            TimelineEvent(
                id=str(uuid4()),
                type="decision",
                description=text,
            )
        )

        return decision

    def get_state(self) -> IncidentState:
        return self.state