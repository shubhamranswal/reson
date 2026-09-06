'use client';

import { useEffect, useMemo, useState } from 'react';

type Fact = {
  id: string;
  text: string;
  source: string;
  timestamp: string;
};

type Hypothesis = {
  id: string;
  text: string;
  proposed_by: string | null;
  status: string;
  timestamp: string;
};

type IncidentAction = {
  id: string;
  description: string;
  owner: string | null;
  status: string;
  requires_confirmation: boolean;
  timestamp: string;
};

type Decision = {
  id: string;
  text: string;
  decided_by: string | null;
  timestamp: string;
};

type Conflict = {
  id: string;
  description: string;
  related_fact_ids: string[];
  related_hypothesis_ids: string[];
  resolved: boolean;
};

type TimelineEvent = {
  id: string;
  type: string;
  description: string;
  timestamp: string;
};

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  facts: Fact[];
  hypotheses: Hypothesis[];
  decisions: Decision[];
  actions: IncidentAction[];
  conflicts: Conflict[];
  timeline: TimelineEvent[];
};

type SectionKey =
  | 'facts'
  | 'hypotheses'
  | 'decisions'
  | 'actions'
  | 'conflicts'
  | 'timeline';

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();

  if (diff < 60_000) {
    return 'just now';
  }

  const minutes = Math.floor(diff / 60_000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return formatTime(timestamp);
}

function capitalize(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function matchesSearch(value: string, query: string) {
  if (!query.trim()) return true;
  return value.toLowerCase().includes(query.toLowerCase().trim());
}

function SectionHeader({
  title,
  count,
  open,
  onClick,
  accent,
}: {
  title: string;
  count: number;
  open: boolean;
  onClick: () => void;
  accent?: 'default' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
      aria-expanded={open}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs',
            accent === 'warning'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground',
          ].join(' ')}
        >
          {accent === 'warning' ? '!' : '•'}
        </span>

        <span className="text-sm font-semibold text-foreground">
          {title}
        </span>

        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>

      <span
        className={[
          'text-muted-foreground transition-transform',
          open ? 'rotate-180' : '',
        ].join(' ')}
      >
        ↓
      </span>
    </button>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const className =
    normalized === 'supported' || normalized === 'completed'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : normalized === 'contradicted' || normalized === 'cancelled'
        ? 'bg-destructive/10 text-destructive'
        : normalized === 'in_progress'
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'bg-muted text-muted-foreground';

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${className}`}
    >
      {capitalize(status)}
    </span>
  );
}

export default function IncidentDashboard() {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<
    Record<SectionKey, boolean>
  >({
    facts: false,
    hypotheses: false,
    decisions: false,
    actions: false,
    conflicts: false,
    timeline: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchIncident() {
      try {
        const response = await fetch('/api/incidents/current', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch incident state');
        }

        const data = (await response.json()) as Incident;

        if (!cancelled) {
          setIncident(data);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load incident:', err);

        if (!cancelled) {
          setError('Unable to load incident state.');
        }
      }
    }

    fetchIncident();

    const interval = setInterval(fetchIncident, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const unresolvedConflicts = useMemo(
    () =>
      incident?.conflicts.filter((conflict) => !conflict.resolved) ?? [],
    [incident],
  );

  const searchResults = useMemo(() => {
    if (!incident || !search.trim()) {
      return {
        facts: incident?.facts ?? [],
        hypotheses: incident?.hypotheses ?? [],
        decisions: incident?.decisions ?? [],
        actions: incident?.actions ?? [],
        conflicts: incident?.conflicts ?? [],
        timeline: incident?.timeline ?? [],
      };
    }

    return {
      facts: incident.facts.filter((fact) =>
        matchesSearch(`${fact.text} ${fact.source}`, search),
      ),

      hypotheses: incident.hypotheses.filter((hypothesis) =>
        matchesSearch(
          `${hypothesis.text} ${hypothesis.proposed_by ?? ''} ${hypothesis.status}`,
          search,
        ),
      ),

      decisions: incident.decisions.filter((decision) =>
        matchesSearch(
          `${decision.text} ${decision.decided_by ?? ''}`,
          search,
        ),
      ),

      actions: incident.actions.filter((action) =>
        matchesSearch(
          `${action.description} ${action.owner ?? ''} ${action.status}`,
          search,
        ),
      ),

      conflicts: incident.conflicts.filter((conflict) =>
        matchesSearch(conflict.description, search),
      ),

      timeline: incident.timeline.filter((event) =>
        matchesSearch(`${event.type} ${event.description}`, search),
      ),
    };
  }, [incident, search]);

  useEffect(() => {
    if (!search.trim()) return;

    const matchingSections = Object.entries(searchResults)
      .filter(([, items]) => items.length > 0)
      .map(([key]) => key);

    setOpenSections((previous) => {
      const next = { ...previous };

      for (const key of matchingSections) {
        next[key as SectionKey] = true;
      }

      return next;
    });
  }, [search, searchResults]);

  const toggleSection = (section: SectionKey) => {
    setOpenSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  if (error) {
    return (
      <aside className="flex h-full w-full flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 p-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            !
          </span>

          <div>
            <p className="text-sm font-medium text-foreground">
              Incident state unavailable
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </aside>
    );
  }

  if (!incident) {
    return (
      <aside className="flex h-full w-full flex-col rounded-2xl border border-border bg-card">
        <div className="animate-pulse space-y-4 p-5">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-10 rounded-xl bg-muted" />
          <div className="h-10 rounded-xl bg-muted" />
          <div className="h-10 rounded-xl bg-muted" />
        </div>
      </aside>
    );
  }

  const stats = [
    { label: 'Facts', count: incident.facts.length },
    { label: 'Hypotheses', count: incident.hypotheses.length },
    { label: 'Actions', count: incident.actions.length },
    { label: 'Conflicts', count: unresolvedConflicts.length },
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={[
                  'rounded-md px-2 py-1 text-[10px] font-bold tracking-wide',
                  incident.severity === 'SEV-1'
                    ? 'bg-destructive/10 text-destructive'
                    : incident.severity === 'SEV-2'
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {incident.severity}
              </span>

              <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {capitalize(incident.status)}
              </span>
            </div>

            <h1 className="truncate text-base font-semibold tracking-tight">
              {incident.title}
            </h1>

            <p className="mt-1 text-[11px] text-muted-foreground">
              {incident.id}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Live
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              auto-sync
            </p>
          </div>
        </div>

        {/* Compact stats */}
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-muted/50 px-2 py-2 text-center"
            >
              <p className="text-sm font-semibold text-foreground">
                {stat.count}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ⌕
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search incident state..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {search.trim() && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {Object.values(searchResults).reduce(
              (total, items) => total + items.length,
              0,
            )}{' '}
            matching items
          </p>
        )}
      </div>

      {/* Scrollable state */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
        {/* Conflict alert */}
        {unresolvedConflicts.length > 0 && !search.trim() && (
          <div className="mb-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <button
              type="button"
              onClick={() => toggleSection('conflicts')}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-xs font-bold text-destructive">
                !
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-destructive">
                  {unresolvedConflicts.length}{' '}
                  {unresolvedConflicts.length === 1
                    ? 'unresolved conflict'
                    : 'unresolved conflicts'}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  Review evidence that does not agree.
                </p>
              </div>

              <span className="text-muted-foreground">›</span>
            </button>
          </div>
        )}

        {/* Facts */}
        <section className="border-b border-border/60">
          <SectionHeader
            title="Facts"
            count={searchResults.facts.length}
            open={openSections.facts}
            onClick={() => toggleSection('facts')}
          />

          {openSections.facts && (
            <div className="space-y-2 px-3 pb-3">
              {searchResults.facts.length === 0 ? (
                <EmptyState>No matching facts.</EmptyState>
              ) : (
                searchResults.facts.map((fact) => (
                  <div
                    key={fact.id}
                    className="rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                        ✓
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs leading-5 text-foreground">
                          {fact.text}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatTime(fact.timestamp)}</span>
                          <span>·</span>
                          <span>{fact.source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Hypotheses */}
        <section className="border-b border-border/60">
          <SectionHeader
            title="Hypotheses"
            count={searchResults.hypotheses.length}
            open={openSections.hypotheses}
            onClick={() => toggleSection('hypotheses')}
          />

          {openSections.hypotheses && (
            <div className="space-y-2 px-3 pb-3">
              {searchResults.hypotheses.length === 0 ? (
                <EmptyState>No matching hypotheses.</EmptyState>
              ) : (
                searchResults.hypotheses.map((hypothesis) => (
                  <div
                    key={hypothesis.id}
                    className="rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                        ?
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs leading-5 text-foreground">
                            {hypothesis.text}
                          </p>

                          <StatusBadge status={hypothesis.status} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatTime(hypothesis.timestamp)}</span>

                          {hypothesis.proposed_by && (
                            <>
                              <span>·</span>
                              <span>{hypothesis.proposed_by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Decisions */}
        <section className="border-b border-border/60">
          <SectionHeader
            title="Decisions"
            count={searchResults.decisions.length}
            open={openSections.decisions}
            onClick={() => toggleSection('decisions')}
          />

          {openSections.decisions && (
            <div className="space-y-2 px-3 pb-3">
              {searchResults.decisions.length === 0 ? (
                <EmptyState>No decisions recorded.</EmptyState>
              ) : (
                searchResults.decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[10px] text-blue-600 dark:text-blue-400">
                        ✓
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs leading-5 text-foreground">
                          {decision.text}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatTime(decision.timestamp)}</span>

                          {decision.decided_by && (
                            <>
                              <span>·</span>
                              <span>{decision.decided_by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="border-b border-border/60">
          <SectionHeader
            title="Actions"
            count={searchResults.actions.length}
            open={openSections.actions}
            onClick={() => toggleSection('actions')}
          />

          {openSections.actions && (
            <div className="space-y-2 px-3 pb-3">
              {searchResults.actions.length === 0 ? (
                <EmptyState>No matching actions.</EmptyState>
              ) : (
                searchResults.actions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-[10px] text-muted-foreground">
                        {action.status === 'completed' ? '✓' : ''}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs leading-5 text-foreground">
                            {action.description}
                          </p>

                          <StatusBadge status={action.status} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          {action.owner && <span>{action.owner}</span>}

                          {action.owner && <span>·</span>}

                          <span>{formatRelativeTime(action.timestamp)}</span>

                          {action.requires_confirmation && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400">
                                confirmation required
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Conflicts */}
        <section className="border-b border-border/60">
          <SectionHeader
            title="Conflicts"
            count={searchResults.conflicts.length}
            open={openSections.conflicts}
            onClick={() => toggleSection('conflicts')}
            accent={
              unresolvedConflicts.length > 0 ? 'warning' : 'default'
            }
          />

          {openSections.conflicts && (
            <div className="space-y-2 px-3 pb-3">
              {searchResults.conflicts.length === 0 ? (
                <EmptyState>No matching conflicts.</EmptyState>
              ) : (
                searchResults.conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className={[
                      'rounded-xl border p-3',
                      conflict.resolved
                        ? 'border-border bg-background/50'
                        : 'border-destructive/20 bg-destructive/5',
                    ].join(' ')}
                  >
                    <div className="flex gap-3">
                      <span
                        className={[
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs',
                          conflict.resolved
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-destructive/10 text-destructive',
                        ].join(' ')}
                      >
                        !
                      </span>

                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={
                              conflict.resolved
                                ? 'text-[10px] font-semibold text-muted-foreground'
                                : 'text-[10px] font-semibold text-destructive'
                            }
                          >
                            {conflict.resolved ? 'Resolved' : 'Unresolved'}
                          </span>
                        </div>

                        <p className="text-xs leading-5 text-foreground">
                          {conflict.description}
                        </p>

                        {(conflict.related_fact_ids.length > 0 ||
                          conflict.related_hypothesis_ids.length > 0) && (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {conflict.related_fact_ids.length +
                              conflict.related_hypothesis_ids.length}{' '}
                            linked evidence item
                            {conflict.related_fact_ids.length +
                              conflict.related_hypothesis_ids.length !==
                            1
                              ? 's'
                              : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Timeline */}
        <section>
          <SectionHeader
            title="Timeline"
            count={searchResults.timeline.length}
            open={openSections.timeline}
            onClick={() => toggleSection('timeline')}
          />

          {openSections.timeline && (
            <div className="px-3 pb-3">
              {searchResults.timeline.length === 0 ? (
                <EmptyState>No matching timeline events.</EmptyState>
              ) : (
                <div className="relative ml-2">
                  <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />

                  <div className="space-y-4">
                    {[...searchResults.timeline]
                      .reverse()
                      .map((event) => (
                        <div
                          key={event.id}
                          className="relative flex gap-3"
                        >
                          <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-card bg-primary" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {event.type}
                              </span>

                              <span className="text-[10px] text-muted-foreground">
                                {formatTime(event.timestamp)}
                              </span>
                            </div>

                            <p className="mt-1 text-xs leading-5 text-foreground">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {search.trim() &&
          Object.values(searchResults).every(
            (items) => items.length === 0,
          ) && (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                Nothing found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try searching for a service, person, symptom, or keyword.
              </p>
            </div>
          )}
      </div>
    </aside>
  );
}