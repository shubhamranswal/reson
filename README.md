# Reson

### AI Incident Commander for real-time incident response

Reson is a voice-first AI Incident Commander designed to help engineering teams reason through live technical incidents.

Instead of treating an incident conversation as a transcript, Reson maintains a structured operational picture of:

- **Facts**: confirmed observations
- **Hypotheses**: possible explanations that still need evidence
- **Actions**: work that needs to be performed
- **Decisions**: important decisions made by responders
- **Conflicts**: contradictory or potentially inconsistent information
- **Timeline**: meaningful events throughout the incident

The result is a system that turns a live voice conversation into an evolving incident state and an actionable post-incident report.

---

## Why Reson?

During a production incident, responders are usually juggling several things at once:

- listening to multiple people
- remembering what has already been established
- separating evidence from assumptions
- tracking actions and ownership
- noticing contradictions
- keeping the incident timeline coherent
- communicating status to stakeholders

Traditional incident tooling is mostly passive. Someone has to manually update tickets, notes, timelines, and status pages while the incident is happening.

**Reson participates in the conversation itself.**

It listens, reasons about the current incident context, selectively updates structured state, and can answer questions using that state.

> **Voice in → structured operational intelligence out.**

---

## Core Capabilities

### 🎙️ Real-time voice interaction

Reson participates in a live Agora voice session and can be interrupted naturally during conversation.

The AI uses:

- Agora Conversational AI
- Deepgram STT
- OpenAI LLM
- MiniMax TTS

The conversation is designed to feel like an incident commander participating in the response rather than a voice chatbot waiting for scripted commands.

### 🧠 Context-aware incident reasoning

Reson does not blindly record every sentence.

It evaluates whether information is:

1. materially relevant
2. new
3. sufficiently clear
4. already represented in the incident state
5. useful to the team's shared understanding

This keeps the incident state operationally useful instead of turning it into a noisy transcript.

### 🗂️ Structured incident state

Each incident maintains structured state for:

```text
Incident
├── Facts
├── Hypotheses
├── Decisions
├── Actions
├── Timeline
├── Conflicts
├── Participants
└── Room
```

The incident state is the source of truth for operational information.

### 🔎 Hypothesis tracking

Responders can discuss possible causes without prematurely treating them as facts.

Hypotheses can be:

- unverified
- supported
- contradicted

This preserves the distinction between **what we know** and **what we think**.

### ⚠️ Conflict detection

Reson can identify meaningful contradictions and missing context.

It avoids declaring a conflict merely because two statements sound surprising. When context is insufficient, it can ask a focused question to determine whether the observations actually refer to the same system, property, or time window.

### 🛠️ MCP-powered incident tools

Reson uses an MCP server to interact with structured incident state.

Current capabilities include tools for:

- reading incident state
- recording facts, hypotheses, and actions
- recording decisions
- recording conflicts
- resolving conflicts
- supporting hypotheses
- contradicting hypotheses
- resolving incidents
- creating incidents
- listing incidents
- switching incidents

This keeps the AI's reasoning layer separate from the incident-state implementation.

### 🔄 Multi-incident support

Reson supports multiple incidents within the same application.

Each incident has its own structured state, and users can switch the active incident during an investigation.

The reporting workspace can independently select incidents without changing the active Reson conversation context.

### 📊 Incident reporting

The `/reports` workspace turns incident state into a structured report containing:

- executive summary
- KPI cards
- incident timeline
- hypothesis breakdown
- action breakdown
- conflicts and risks
- decisions
- action items

Reports can be exported as PDF.

### 👥 Participant-aware architecture

The incident model supports named participants and room state.

The current Phase 4 work introduces the foundation for a shared incident room:

```text
Incident
   │
   ├── Participants
   │
   └── Room
        └── Stable Agora channel
```

The intended architecture is:

> **One incident → one room → one Reson → many participants**

The full multi-browser shared Reson session is the next implementation step.

---

# Architecture

```text
                         ┌──────────────────────┐
                         │      Browser UI      │
                         │      Next.js         │
                         └──────────┬───────────┘
                                    │
                         Voice / UI │ API
                                    │
             ┌──────────────────────┴──────────────────────┐
             │                                             │
             ▼                                             ▼
┌─────────────────────────┐                  ┌─────────────────────────┐
│ Agora Conversational AI │                  │      FastAPI Backend    │
│                         │                  │                         │
│  Deepgram STT           │                  │     IncidentStore       │
│  OpenAI LLM             │                  │           │             │
│  MiniMax TTS            │                  │           ▼             │
│                         │                  │    IncidentState        │
│       Reson             │                  │                         │
└────────────┬────────────┘                  └────────────┬────────────┘
             │                                            │
             │ MCP                                        │
             └──────────────────────┬─────────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │      MCP Server      │
                         │                      │
                         │ Incident tools       │
                         │ State management     │
                         └──────────────────────┘
```

## Key architectural principle

**IncidentStore is the source of truth.**

The AI does not maintain a separate copy of the incident state as the authoritative record.

When current state matters, Reson reads the structured incident state through MCP.

This allows the conversation layer, API layer, and reporting layer to operate around the same underlying incident model.

---

# Incident State Model

A simplified incident looks like:

```json
{
  "id": "INC-001",
  "title": "Payment Service Outage",
  "severity": "SEV-1",
  "status": "investigating",
  "participants": [],
  "facts": [],
  "hypotheses": [],
  "decisions": [],
  "actions": [],
  "timeline": [],
  "conflicts": [],
  "room": {
    "channel": "incident-INC-001",
    "agent_id": null
  }
}
```

### Facts

Confirmed information.

Example:

```text
Payment API error rate increased to 42%.
```

### Hypotheses

Possible explanations that have not yet been confirmed.

Example:

```text
Database connection exhaustion may be contributing to the failures.
```

### Actions

Work that needs to happen.

Example:

```text
Inspect database connection pool utilization.
```

### Decisions

Important decisions made by responders.

Example:

```text
Rollback the latest payment-service deployment.
```

### Conflicts

Potentially contradictory observations.

Example:

```text
Application reports database connectivity failures,
while database health checks remain green.
```

---

# MCP Layer

The FastAPI backend exposes the MCP server at:

```text
/mcp
```

The MCP server provides structured tools for interacting with the incident state.

Example tool categories:

```text
Read
├── get_incident_state
└── list_incidents

Write
├── record_incident_event
├── record_incident_decision
└── record_incident_conflict

Reasoning / lifecycle
├── support_incident_hypothesis
├── contradict_incident_hypothesis
├── resolve_incident_conflict
└── resolve_incident

Incident management
├── create_incident
└── switch_incident
```

The AI is instructed to use tools when they improve the operational picture, not simply because every user utterance could be classified.

---

# Application Structure

The project is split into two main applications:

```text
reson/
│
├── backend/
│   ├── app/
│   │   ├── incident/
│   │   │   ├── store.py
│   │   │   └── ...
│   │   ├── mcp/
│   │   │   └── server.py
│   │   ├── models/
│   │   │   └── incident.py
│   │   └── api/
│   │       ├── incidents.py
│   │       ├── events.py
│   │       └── rooms.py
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── api/
    │   │   ├── generate-agora-token/
    │   │   ├── invite-agent/
    │   │   └── ...
    │   └── ...
    ├── components/
    ├── lib/
    └── types/
```

---

# Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js / React / TypeScript |
| Backend | FastAPI / Python |
| Voice | Agora Conversational AI |
| RTC / RTM | Agora |
| Speech-to-Text | Deepgram |
| LLM | OpenAI |
| Text-to-Speech | MiniMax |
| Agent tools | MCP |
| Incident state | In-memory IncidentStore |
| Validation / models | Pydantic |
| Reports | Next.js reporting workspace |
| PDF export | Browser-side PDF generation |

---

# Running Locally

## Prerequisites

You will need:

- Node.js
- pnpm
- Python
- Agora credentials
- configured LLM/STT/TTS services
- a running FastAPI backend
- a running Next.js frontend

## Backend

From the backend directory:

```bash
cd backend
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn app.main:app --reload
```

The backend runs on:

```text
http://localhost:8000
```

Health check:

```text
GET /health
```

MCP endpoint:

```text
http://localhost:8000/mcp/
```

## Frontend

From the frontend directory:

```bash
cd frontend
pnpm install
pnpm dev
```

The Next.js application runs on:

```text
http://localhost:3000
```

---

# Environment Variables

The exact values depend on your local deployment, but the application expects Agora and Reson configuration such as:

```env
NEXT_PUBLIC_AGORA_APP_ID=...
NEXT_AGORA_APP_CERTIFICATE=...
RESON_MCP_URL=...
```

Additional provider credentials may be required depending on whether reseller presets or BYOK integrations are being used.

**Never commit credentials or `.env` files to the repository.**

---

# API Highlights

## Incidents

```http
GET /api/incidents
```

List incidents.

```http
GET /api/incidents/current
```

Get the currently active incident.

```http
GET /api/incidents/{incident_id}
```

Get a specific incident.

```http
POST /api/incidents
```

Create an incident.

```http
POST /api/incidents/switch
```

Switch the active incident.

## Rooms

```http
POST /api/rooms/join
```

Register a participant in an incident room.

Example:

```json
{
  "incident_id": "INC-001",
  "name": "Shubham"
}
```

Example response:

```json
{
  "incident_id": "INC-001",
  "channel": "incident-INC-001",
  "participant": {
    "id": "participant-1",
    "name": "Shubham",
    "role": "participant"
  },
  "agent_started": false
}
```

The room channel is deterministic:

```text
INC-001 → incident-INC-001
```

This is the foundation for the shared multi-user room architecture.

---

# Example Incident Conversation

A responder says:

> "Payment failures started about ten minutes ago. The database team says the database is healthy, but we're also seeing query timeouts."

Reson can maintain structured state such as:

```text
FACT
Payment failures started approximately 10 minutes ago.

FACT
Database team reports healthy database status.

FACT
Query timeouts are being observed.

HYPOTHESIS
Database performance degradation may be contributing.

TIMELINE
Payment failures began approximately 10 minutes ago.
```

If later evidence establishes that two observations genuinely conflict, Reson can represent that conflict instead of silently choosing one side.

---

# Reporting

Navigate to:

```text
/reports
```

The reporting workspace provides an incident-focused view of the structured state.

It includes:

```text
Executive Summary
       ↓
KPI Cards
       ↓
Timeline
       ↓
Hypotheses
       ↓
Actions
       ↓
Conflicts / Risks
       ↓
Decisions
```

Reports can be selected independently by incident and exported to PDF.

---

# Demo Flow

A concise demonstration can follow this sequence:

### 1. Start with an active incident

Show:

```text
Payment Service Outage
SEV-1
Investigating
```

### 2. Start a voice conversation

Introduce Reson as the AI Incident Commander.

### 3. Feed it an evolving incident

Discuss:

- elevated payment failures
- database latency
- deployment timing
- possible root causes
- actions being considered

### 4. Show structured state

Demonstrate that Reson has separated:

```text
Facts
Hypotheses
Actions
Timeline
```

rather than simply displaying a transcript.

### 5. Introduce conflicting evidence

Give Reson two observations that require contextual reasoning.

Show the conflict/missing information handling.

### 6. Open `/reports`

Show the incident summary and timeline.

### 7. Export the report

Download the generated PDF.

The story becomes:

```text
Live voice conversation
        ↓
AI reasoning
        ↓
Structured incident state
        ↓
Operational visibility
        ↓
Incident report
```

---

# Design Philosophy

### Don't transcribe. Understand.

Reson is not intended to create a database entry for every sentence.

### Don't guess. Preserve uncertainty.

A hypothesis should remain a hypothesis until evidence supports it.

### Don't hide contradictions.

Conflicting evidence is operationally valuable information.

### Don't make the AI the database.

The incident state belongs to the application. Reson reasons over it through MCP.

### Keep humans in the loop.

Critical operational actions can require human confirmation.

---

# Current Status

### Completed

- [x] Real-time voice incident interaction
- [x] Interruptible conversational AI
- [x] Structured incident state
- [x] Facts / hypotheses / actions
- [x] Decisions
- [x] Conflict tracking and resolution
- [x] Hypothesis support / contradiction
- [x] Incident lifecycle
- [x] MCP incident tools
- [x] Multi-incident architecture
- [x] Silent incident switching
- [x] Multi-incident reporting
- [x] Executive summary
- [x] Timeline and breakdown views
- [x] PDF report export
- [x] Participant model
- [x] Incident room foundation
- [x] `/api/rooms/join`

### Next

- [ ] Complete shared multi-browser Agora room
- [ ] Start one Reson agent per incident room
- [ ] Allow multiple participants to share the same Reson session
- [ ] Participant presence and role-aware interaction

---

# Roadmap

```text
Phase 1
Stabilize
   ✓

Phase 2
Multi-incident architecture
   ✓

Phase 3
Reporting
   ✓

Phase 4
Multi-user incident rooms
   ├── Room foundation       ✓
   ├── Participant join      ✓
   ├── Shared Agora session  → next
   └── Multi-browser E2E     → next
```

---

# Project Vision

Incident response should not require engineers to simultaneously be:

- investigators
- note takers
- meeting facilitators
- timeline maintainers
- status communicators

Reson is designed to become the operational layer between the conversation and the incident record.

The long-term goal is simple:

> **When an incident gets chaotic, Reson keeps the team's understanding coherent.**

---

## Built for real-time incident response

**Reson**  
*AI Incident Commander*
