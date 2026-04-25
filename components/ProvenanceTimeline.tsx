'use client';

import Image from 'next/image';
import type { ProvenanceEvent } from '@/lib/types';

interface Props {
  events: ProvenanceEvent[];
  originLabel?: string;
  currentLocationName?: string;
}

const DOT_COLORS: Record<string, string> = {
  red: 'bg-[#e74c3c] border-[#e74c3c]',
  gold: 'bg-[#daa520] border-[#daa520]',
  green: 'bg-[#52b788] border-[#52b788]',
  neutral: 'bg-[#c8b89a] border-[#c8b89a]',
};

const LABEL_COLORS: Record<string, string> = {
  red: 'text-[#e74c3c]',
  gold: 'text-[#daa520]',
  green: 'text-[#52b788]',
  neutral: 'text-[#c8b89a]',
};

export function ProvenanceTimeline({ events, originLabel, currentLocationName }: Props) {
  const allSteps = [
    { type: 'origin' as const },
    ...events.map((e) => ({ type: 'event' as const, event: e })),
    { type: 'current' as const },
  ];

  return (
    <div className="relative">
      {allSteps.map((step, idx) => {
        const isLast = idx === allSteps.length - 1;

        if (step.type === 'origin') {
          return (
            <TimelineRow
              key="origin"
              dotColor="bg-[#e74c3c] border-[#e74c3c]"
              labelColor="text-[#e74c3c]"
              label="Origin"
              title="Magdala, Ethiopia"
              subtitle="Historical site of the battle, April 1868"
              isLast={false}
            />
          );
        }

        if (step.type === 'current') {
          return (
            <TimelineRow
              key="current"
              dotColor={DOT_COLORS.green}
              labelColor={LABEL_COLORS.green}
              label="Current Location"
              title={currentLocationName ?? 'Unknown'}
              isLast={true}
            />
          );
        }

        const { event } = step;
        return (
          <TimelineRow
            key={`${event.eventQID}-${idx}`}
            dotColor={DOT_COLORS[event.color]}
            labelColor={LABEL_COLORS[event.color]}
            label={event.eventLabel}
            title={event.location ?? event.period ?? '—'}
            subtitle={event.date}
            isLast={isLast}
          >
            {/* Ownership chain */}
            {(event.beforehandOwnedBy || event.afterwardOwnedBy) && (
              <div className="mt-2 flex flex-col gap-1">
                {event.beforehandOwnedBy && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#c8b89a] shrink-0">Beforehand owned by</span>
                    <span className="text-[#f4ead5]">{event.beforehandOwnedBy.label}</span>
                  </div>
                )}
                {event.afterwardOwnedBy && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#c8b89a] shrink-0">Afterward owned by</span>
                    <span className="text-[#f4ead5]">{event.afterwardOwnedBy.label}</span>
                  </div>
                )}
              </div>
            )}

            {/* Participants */}
            {event.participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {event.participants.map((p) => (
                  <div
                    key={p.qid}
                    className="flex items-center gap-1.5 bg-[#1a0e06] border border-[#4a2c0e] rounded-full px-2 py-1"
                  >
                    {p.portraitUrl ? (
                      <Image
                        src={p.portraitUrl}
                        alt={p.label}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[#4a2c0e] flex items-center justify-center text-[8px] text-[#c8b89a] uppercase">
                        {p.label[0]}
                      </span>
                    )}
                    <span className="text-xs text-[#c8b89a]">{p.label}</span>
                  </div>
                ))}
              </div>
            )}
          </TimelineRow>
        );
      })}
    </div>
  );
}

interface TimelineRowProps {
  dotColor: string;
  labelColor: string;
  label: string;
  title: string;
  subtitle?: string;
  isLast: boolean;
  children?: React.ReactNode;
}

function TimelineRow({
  dotColor,
  labelColor,
  label,
  title,
  subtitle,
  isLast,
  children,
}: TimelineRowProps) {
  return (
    <div className="flex gap-3">
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1 ${dotColor}`}
        />
        {!isLast && <div className="w-px flex-1 bg-[#4a2c0e] mt-1 mb-1 min-h-[20px]" />}
      </div>

      {/* Content */}
      <div className={`pb-4 ${isLast ? 'pb-0' : ''} flex-1`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
        <p className="text-sm text-[#f4ead5] mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-[#c8b89a] mt-0.5">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
