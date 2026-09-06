'use client';

import { Loader2, Mic, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  return (
    <div className="mx-auto flex w-[min(92vw,28rem)] flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-sm">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Join the incident room
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Talk to Reson in real time. It listens to the incident, tracks
          what is known, separates hypotheses from facts, and helps the team
          maintain a shared operational picture.
        </p>
      </div>

      {/* Capabilities */}
      <div className="mt-6 space-y-2.5">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <Mic className="h-4 w-4 shrink-0 text-primary" />
          Real-time voice conversation
        </div>

        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          Facts, hypotheses, actions and conflicts tracked live
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={onStartConversation}
        disabled={isLoading}
        className="mt-7 h-11 w-full rounded-lg text-sm font-medium"
        aria-label={
          isLoading
            ? 'Joining incident room'
            : 'Join incident room'
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining incident room...
          </>
        ) : (
          'Join Incident Room'
        )}
      </Button>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs leading-5 text-destructive">
          {error}
        </div>
      )}

      <p className="mt-4 text-center text-[10px] text-muted-foreground">
        Your microphone will be requested when the session starts.
      </p>
    </div>
  );
}