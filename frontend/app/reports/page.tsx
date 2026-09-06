'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type IncidentStatus =
    | 'investigating'
    | 'mitigating'
    | 'recovering'
    | 'resolved';

type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3';

type IncidentSummary = {
    id: string;
    title: string;
    severity: Severity;
    status: IncidentStatus;
    opened_by?: string | null;
};

type Fact = {
    id: string;
    text: string;
    source: string;
    timestamp: string;
};

type Hypothesis = {
    id: string;
    text: string;
    proposed_by?: string | null;
    status: 'unverified' | 'supported' | 'contradicted';
    timestamp: string;
};

type IncidentAction = {
    id: string;
    description: string;
    owner?: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    requires_confirmation: boolean;
    timestamp: string;
};

type Decision = {
    id: string;
    text: string;
    decided_by?: string | null;
    timestamp: string;
};

type TimelineEvent = {
    id: string;
    type: string;
    description: string;
    timestamp: string;
};

type Conflict = {
    id: string;
    description: string;
    related_fact_ids: string[];
    related_hypothesis_ids: string[];
    resolved: boolean;
};

type Participant = {
    id: string;
    name: string;
    role: string;
};

type Incident = IncidentSummary & {
    participants: Participant[];
    facts: Fact[];
    hypotheses: Hypothesis[];
    decisions: Decision[];
    actions: IncidentAction[];
    timeline: TimelineEvent[];
    conflicts: Conflict[];
};

const API_URL =
    process.env.NEXT_PUBLIC_RESON_API_URL ?? 'http://127.0.0.1:8000';

const statusLabels: Record<IncidentStatus, string> = {
    investigating: 'Investigating',
    mitigating: 'Mitigating',
    recovering: 'Recovering',
    resolved: 'Resolved',
};

const hypothesisLabels = {
    unverified: 'Unverified',
    supported: 'Supported',
    contradicted: 'Contradicted',
};

const actionLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }

    return date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function severityClass(severity: Severity) {
    switch (severity) {
        case 'SEV-1':
            return 'border-red-500/30 bg-red-500/10 text-red-600';
        case 'SEV-2':
            return 'border-orange-500/30 bg-orange-500/10 text-orange-600';
        case 'SEV-3':
            return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700';
    }
}

function statusClass(status: IncidentStatus) {
    switch (status) {
        case 'resolved':
            return 'border-green-500/30 bg-green-500/10 text-green-600';
        case 'recovering':
            return 'border-blue-500/30 bg-blue-500/10 text-blue-600';
        case 'mitigating':
            return 'border-orange-500/30 bg-orange-500/10 text-orange-600';
        case 'investigating':
            return 'border-purple-500/30 bg-purple-500/10 text-purple-600';
    }
}

function buildExecutiveSummary(incident: Incident) {
    const supported = incident.hypotheses.filter(
        (item) => item.status === 'supported',
    );

    const openConflicts = incident.conflicts.filter(
        (item) => !item.resolved,
    );

    const inProgressActions = incident.actions.filter(
        (item) => item.status === 'in_progress',
    );

    const pendingActions = incident.actions.filter(
        (item) => item.status === 'pending',
    );

    const latestEvent = [...incident.timeline].sort(
        (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime(),
    )[0];

    const parts: string[] = [];

    parts.push(
        `${incident.severity} ${incident.title} is currently ${statusLabels[
            incident.status
        ].toLowerCase()}.`,
    );

    parts.push(
        `${incident.facts.length} confirmed fact${incident.facts.length === 1 ? '' : 's'
        } and ${incident.hypotheses.length} hypothes${incident.hypotheses.length === 1 ? 'is' : 'es'
        } have been recorded.`,
    );

    if (supported.length > 0) {
        parts.push(
            `The supported hypothesis is: "${supported[0].text}".`,
        );
    } else if (incident.hypotheses.length > 0) {
        parts.push(
            'No hypothesis has been marked as supported yet.',
        );
    }

    if (inProgressActions.length > 0) {
        parts.push(
            `${inProgressActions.length} action${inProgressActions.length === 1 ? '' : 's'
            } currently ${inProgressActions.length === 1 ? 'is' : 'are'
            } in progress.`,
        );
    }

    if (pendingActions.length > 0) {
        parts.push(
            `${pendingActions.length} action${pendingActions.length === 1 ? '' : 's'
            } remain${pendingActions.length === 1 ? 's' : ''
            } pending.`,
        );
    }

    if (openConflicts.length > 0) {
        parts.push(
            `${openConflicts.length} unresolved conflict${openConflicts.length === 1 ? '' : 's'
            } remain${openConflicts.length === 1 ? 's' : ''
            }.`,
        );
    }

    if (latestEvent) {
        parts.push(
            `Latest timeline event: ${latestEvent.description}`,
        );
    }

    return parts.join(' ');
}

export default function ReportsPage() {

    const reportRef = useRef<HTMLDivElement>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    async function downloadPdf() {
        if (!reportRef.current || !incident) {
            return;
        }

        try {
            setGeneratingPdf(true);

            const element = reportRef.current;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            const imageData = canvas.toDataURL('image/png');

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imageWidth = pageWidth;
            const imageHeight =
                (canvas.height * imageWidth) / canvas.width;

            let heightLeft = imageHeight;
            let position = 0;

            pdf.addImage(
                imageData,
                'PNG',
                0,
                position,
                imageWidth,
                imageHeight,
            );

            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position -= pageHeight;

                pdf.addPage();

                pdf.addImage(
                    imageData,
                    'PNG',
                    0,
                    position,
                    imageWidth,
                    imageHeight,
                );

                heightLeft -= pageHeight;
            }

            pdf.save(
                `${incident.id}-${incident.title
                    .replace(/[^a-z0-9]+/gi, '-')
                    .replace(/^-|-$/g, '')
                    .toLowerCase()}-report.pdf`,
            );
        } catch (error) {
            console.error('[Reports] Failed to generate PDF:', error);
        } finally {
            setGeneratingPdf(false);
        }
    }

    const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
        null,
    );
    const [incident, setIncident] = useState<Incident | null>(null);

    const [loadingIncidents, setLoadingIncidents] = useState(true);
    const [loadingReport, setLoadingReport] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadIncidents() {
            try {
                setLoadingIncidents(true);
                setError(null);

                const response = await fetch(`${API_URL}/api/incidents`, {
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch incidents');
                }

                const data = (await response.json()) as IncidentSummary[];

                setIncidents(data);

                if (data.length > 0) {
                    setSelectedIncidentId(data[0].id);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load incidents',
                );
            } finally {
                setLoadingIncidents(false);
            }
        }

        loadIncidents();
    }, []);

    useEffect(() => {
        if (!selectedIncidentId) {
            return;
        }

        async function loadReport() {
            try {
                setLoadingReport(true);
                setError(null);

                const response = await fetch(
                    `${API_URL}/api/incidents/${selectedIncidentId}`,
                    {
                        cache: 'no-store',
                    },
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch incident report');
                }

                const data = (await response.json()) as Incident;

                setIncident(data);
            } catch (err) {
                setIncident(null);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load incident report',
                );
            } finally {
                setLoadingReport(false);
            }
        }

        loadReport();
    }, [selectedIncidentId]);

    const hypothesisBreakdown = useMemo(() => {
        if (!incident) return null;

        return {
            unverified: incident.hypotheses.filter(
                (item) => item.status === 'unverified',
            ).length,
            supported: incident.hypotheses.filter(
                (item) => item.status === 'supported',
            ).length,
            contradicted: incident.hypotheses.filter(
                (item) => item.status === 'contradicted',
            ).length,
        };
    }, [incident]);

    const actionBreakdown = useMemo(() => {
        if (!incident) return null;

        return {
            pending: incident.actions.filter(
                (item) => item.status === 'pending',
            ).length,
            inProgress: incident.actions.filter(
                (item) => item.status === 'in_progress',
            ).length,
            completed: incident.actions.filter(
                (item) => item.status === 'completed',
            ).length,
            cancelled: incident.actions.filter(
                (item) => item.status === 'cancelled',
            ).length,
        };
    }, [incident]);

    return (
        <main className="min-h-screen bg-background">
            <div className="flex min-h-screen">
                {/* Sidebar */}
                <aside className="hidden w-80 shrink-0 border-r bg-card lg:block">
                    <div className="sticky top-0 flex max-h-screen flex-col">
                        <div className="border-b p-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Reson
                            </p>

                            <h1 className="mt-1 text-xl font-bold">
                                Incident Reports
                            </h1>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Select an incident to view its report.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                            {loadingIncidents ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-20 animate-pulse rounded-lg bg-muted"
                                        />
                                    ))}
                                </div>
                            ) : incidents.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                                    No incidents found.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {incidents.map((item) => {
                                        const selected = item.id === selectedIncidentId;

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedIncidentId(item.id)
                                                }
                                                className={`w-full rounded-xl border p-4 text-left transition ${selected
                                                    ? 'border-foreground/20 bg-muted'
                                                    : 'border-transparent hover:border-border hover:bg-muted/50'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            {item.id}
                                                        </p>

                                                        <p className="mt-1 truncate font-semibold">
                                                            {item.title}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityClass(
                                                            item.severity,
                                                        )}`}
                                                    >
                                                        {item.severity}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">
                                                        {statusLabels[item.status]}
                                                    </span>

                                                    {selected && (
                                                        <span className="text-xs font-medium">
                                                            Viewing
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main report */}
                <section className="min-w-0 flex-1">
                    {loadingReport || loadingIncidents ? (
                        <div className="mx-auto max-w-7xl p-6 md:p-10">
                            <div className="animate-pulse space-y-6">
                                <div className="h-8 w-80 rounded bg-muted" />

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-28 rounded-xl border bg-card"
                                        />
                                    ))}
                                </div>

                                <div className="h-64 rounded-xl border bg-card" />
                            </div>
                        </div>
                    ) : error ? (
                        <div className="mx-auto max-w-7xl p-6 md:p-10">
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <h2 className="font-semibold">
                                    Unable to load report
                                </h2>

                                <p className="mt-2 text-sm text-muted-foreground">
                                    {error}
                                </p>
                            </div>
                        </div>
                    ) : !incident ? (
                        <div className="mx-auto max-w-7xl p-6 md:p-10">
                            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                                Select an incident to view its report.
                            </div>
                        </div>
                    ) : (
                        <div
                            ref={reportRef}
                            className="mx-auto max-w-7xl space-y-8 bg-background p-6 md:p-10"
                        >
                            {/* Report header */}
                            <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Incident Report · {incident.id}
                                    </p>

                                    <h2 className="mt-1 text-3xl font-bold tracking-tight">
                                        {incident.title}
                                    </h2>

                                    {incident.opened_by && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Opened by {incident.opened_by}
                                        </p>
                                    )}
                                </div>

<div className="flex flex-wrap items-center gap-2">
  <span
    className={`rounded-full border px-3 py-1 text-sm font-medium ${severityClass(
      incident.severity,
    )}`}
  >
    {incident.severity}
  </span>

  <span
    className={`rounded-full border px-3 py-1 text-sm font-medium ${statusClass(
      incident.status,
    )}`}
  >
    {statusLabels[incident.status]}
  </span>

  <button
    type="button"
    onClick={downloadPdf}
    disabled={generatingPdf}
    className="inline-flex items-center gap-2 rounded-lg border bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {generatingPdf ? (
      <>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
        Generating...
      </>
    ) : (
      <>
        <span>↓</span>
        Download PDF
      </>
    )}
  </button>
</div>
                            </section>

                            {/* KPI cards */}
                            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                <KpiCard
                                    label="Confirmed Facts"
                                    value={incident.facts.length}
                                />

                                <KpiCard
                                    label="Hypotheses"
                                    value={incident.hypotheses.length}
                                />

                                <KpiCard
                                    label="Actions"
                                    value={incident.actions.length}
                                />

                                <KpiCard
                                    label="Open Conflicts"
                                    value={
                                        incident.conflicts.filter(
                                            (item) => !item.resolved,
                                        ).length
                                    }
                                />
                            </section>

                            {/* Executive summary */}
                            <section className="rounded-xl border bg-card p-6">
                                <SectionTitle title="Executive Summary" />

                                <p className="mt-4 leading-7 text-muted-foreground">
                                    {buildExecutiveSummary(incident)}
                                </p>
                            </section>

                            {/* Breakdowns */}
                            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <BreakdownCard
                                    title="Hypothesis Breakdown"
                                    items={[
                                        {
                                            label: hypothesisLabels.unverified,
                                            value: hypothesisBreakdown?.unverified ?? 0,
                                        },
                                        {
                                            label: hypothesisLabels.supported,
                                            value: hypothesisBreakdown?.supported ?? 0,
                                        },
                                        {
                                            label: hypothesisLabels.contradicted,
                                            value: hypothesisBreakdown?.contradicted ?? 0,
                                        },
                                    ]}
                                />

                                <BreakdownCard
                                    title="Action Breakdown"
                                    items={[
                                        {
                                            label: actionLabels.pending,
                                            value: actionBreakdown?.pending ?? 0,
                                        },
                                        {
                                            label: actionLabels.in_progress,
                                            value: actionBreakdown?.inProgress ?? 0,
                                        },
                                        {
                                            label: actionLabels.completed,
                                            value: actionBreakdown?.completed ?? 0,
                                        },
                                        {
                                            label: actionLabels.cancelled,
                                            value: actionBreakdown?.cancelled ?? 0,
                                        },
                                    ]}
                                />
                            </section>

                            {/* Risks */}
                            <section className="rounded-xl border bg-card p-6">
                                <SectionTitle title="Risks & Conflicts" />

                                {incident.conflicts.length === 0 ? (
                                    <EmptyState text="No conflicts recorded." />
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {incident.conflicts.map((conflict) => (
                                            <div
                                                key={conflict.id}
                                                className="rounded-lg border p-4"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <p className="font-medium">
                                                        {conflict.description}
                                                    </p>

                                                    <span
                                                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${conflict.resolved
                                                            ? 'bg-green-500/10 text-green-600'
                                                            : 'bg-red-500/10 text-red-600'
                                                            }`}
                                                    >
                                                        {conflict.resolved
                                                            ? 'Resolved'
                                                            : 'Open'}
                                                    </span>
                                                </div>

                                                {(conflict.related_fact_ids.length > 0 ||
                                                    conflict.related_hypothesis_ids.length >
                                                    0) && (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            {conflict.related_fact_ids.length}{' '}
                                                            related fact
                                                            {conflict.related_fact_ids.length === 1
                                                                ? ''
                                                                : 's'}
                                                            {' · '}
                                                            {conflict.related_hypothesis_ids.length}{' '}
                                                            related hypothesis
                                                            {conflict.related_hypothesis_ids.length ===
                                                                1
                                                                ? ''
                                                                : 'es'}
                                                        </p>
                                                    )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Actions */}
                            <section className="rounded-xl border bg-card p-6">
                                <SectionTitle title="Actions" />

                                {incident.actions.length === 0 ? (
                                    <EmptyState text="No actions recorded." />
                                ) : (
                                    <div className="mt-4 divide-y">
                                        {incident.actions.map((action) => (
                                            <div
                                                key={action.id}
                                                className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {action.description}
                                                    </p>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {action.owner
                                                            ? `Owner: ${action.owner}`
                                                            : 'No owner assigned'}
                                                    </p>
                                                </div>

                                                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                                                    {actionLabels[action.status]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Decisions */}
                            <section className="rounded-xl border bg-card p-6">
                                <SectionTitle title="Decisions" />

                                {incident.decisions.length === 0 ? (
                                    <EmptyState text="No decisions recorded." />
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {incident.decisions.map((decision) => (
                                            <div
                                                key={decision.id}
                                                className="rounded-lg border p-4"
                                            >
                                                <p className="font-medium">
                                                    {decision.text}
                                                </p>

                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    {decision.decided_by
                                                        ? `Decided by ${decision.decided_by}`
                                                        : 'Decision maker not specified'}
                                                    {' · '}
                                                    {formatTimestamp(decision.timestamp)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Timeline */}
                            <section className="rounded-xl border bg-card p-6">
                                <SectionTitle title="Timeline" />

                                {incident.timeline.length === 0 ? (
                                    <EmptyState text="No timeline events recorded yet." />
                                ) : (
                                    <div className="mt-6 space-y-6">
                                        {[...incident.timeline]
                                            .sort(
                                                (a, b) =>
                                                    new Date(a.timestamp).getTime() -
                                                    new Date(b.timestamp).getTime(),
                                            )
                                            .map((event, index, events) => (
                                                <div
                                                    key={event.id}
                                                    className="relative flex gap-4"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <div className="mt-1 h-3 w-3 rounded-full bg-foreground" />

                                                        {index < events.length - 1 && (
                                                            <div className="mt-2 h-full w-px bg-border" />
                                                        )}
                                                    </div>

                                                    <div className="pb-2">
                                                        <p className="text-sm font-medium">
                                                            {event.type}
                                                        </p>

                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {event.description}
                                                        </p>

                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            {formatTimestamp(event.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function KpiCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold">
                {value}
            </p>
        </div>
    );
}

function SectionTitle({ title }: { title: string }) {
    return (
        <h3 className="text-xl font-semibold tracking-tight">
            {title}
        </h3>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <p className="mt-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {text}
        </p>
    );
}

function BreakdownCard({
    title,
    items,
}: {
    title: string;
    items: { label: string; value: number }[];
}) {
    const total = items.reduce(
        (sum, item) => sum + item.value,
        0,
    );

    return (
        <section className="rounded-xl border bg-card p-6">
            <SectionTitle title={title} />

            <div className="mt-6 space-y-4">
                {items.map((item) => {
                    const percentage =
                        total === 0
                            ? 0
                            : Math.round((item.value / total) * 100);

                    return (
                        <div key={item.label}>
                            <div className="flex items-center justify-between text-sm">
                                <span>{item.label}</span>

                                <span className="text-muted-foreground">
                                    {item.value}
                                </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-foreground transition-all"
                                    style={{
                                        width: `${percentage}%`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}