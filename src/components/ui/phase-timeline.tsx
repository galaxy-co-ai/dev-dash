'use client';

import * as React from 'react';
import { useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'complete' | 'in_progress' | 'pending' | 'blocked';

interface Deliverable {
  name: string;
  status: Status;
  note?: string;
}

interface PhaseTimelineProps {
  phaseId: number;
  phaseName: string;
  phaseStatus: Status;
  deliverables: Deliverable[];
  className?: string;
}

const STATUS_CONFIG = {
  complete: {
    icon: CheckCircle2,
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600',
    label: 'Complete',
  },
  in_progress: {
    icon: Clock,
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-600',
    label: 'In Progress',
  },
  pending: {
    icon: Circle,
    dotClass: 'bg-muted-foreground/30',
    textClass: 'text-muted-foreground',
    label: 'Pending',
  },
  blocked: {
    icon: AlertTriangle,
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-600',
    label: 'Blocked',
  },
};

function CheckpointDot({ 
  status, 
  isHovered 
}: { 
  status: Status; 
  isHovered: boolean;
}) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div 
      className={cn(
        'relative z-10 w-4 h-4 rounded-full transition-all duration-200 border-2 border-background',
        config.dotClass,
        isHovered && 'scale-125',
        isHovered && 'ring-4 ring-opacity-30',
        isHovered && status === 'complete' && 'ring-emerald-500',
        isHovered && status === 'in_progress' && 'ring-blue-500',
        isHovered && status === 'pending' && 'ring-muted-foreground',
        isHovered && status === 'blocked' && 'ring-rose-500',
      )}
    />
  );
}

function HoverCard({
  deliverable,
  position,
}: {
  deliverable: Deliverable;
  position: 'above' | 'below';
}) {
  const config = STATUS_CONFIG[deliverable.status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2 z-50 w-48',
        'bg-background border rounded-lg shadow-lg p-3',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
      )}
    >
      {/* Arrow */}
      <div 
        className={cn(
          'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-background border rotate-45',
          position === 'above' 
            ? 'bottom-[-5px] border-t-0 border-l-0' 
            : 'top-[-5px] border-b-0 border-r-0'
        )}
      />
      
      {/* Content */}
      <div className="flex items-start gap-2">
        <Icon size={14} className={cn('mt-0.5 flex-shrink-0', config.textClass)} />
        <div className="min-w-0">
          <p className="text-xs font-medium leading-tight">{deliverable.name}</p>
          {deliverable.note && (
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
              {deliverable.note}
            </p>
          )}
          <span className={cn('text-[10px] font-medium mt-1 block', config.textClass)}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PhaseTimeline({
  phaseId,
  phaseName,
  phaseStatus,
  deliverables,
  className,
}: PhaseTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const completedCount = deliverables.filter(d => d.status === 'complete').length;
  const progress = Math.round((completedCount / deliverables.length) * 100);
  const phaseConfig = STATUS_CONFIG[phaseStatus];

  return (
    <div className={cn('group', className)}>
      {/* Phase Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Phase {phaseId}
          </span>
          <span className="text-sm font-medium">{phaseName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {completedCount}/{deliverables.length}
          </span>
          <span className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full',
            phaseStatus === 'complete' && 'bg-emerald-100 text-emerald-700',
            phaseStatus === 'in_progress' && 'bg-blue-100 text-blue-700',
            phaseStatus === 'pending' && 'bg-muted text-muted-foreground',
            phaseStatus === 'blocked' && 'bg-rose-100 text-rose-700',
          )}>
            {phaseConfig.label}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative h-10 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />
        
        {/* Progress fill */}
        <div 
          className="absolute left-0 h-1 bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />

        {/* Checkpoints */}
        <div className="absolute inset-x-0 flex justify-between px-1">
          {deliverables.map((deliverable, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <CheckpointDot 
                status={deliverable.status} 
                isHovered={hoveredIndex === index}
              />
              
              {/* Hover Card */}
              {hoveredIndex === index && (
                <HoverCard 
                  deliverable={deliverable} 
                  position={phaseId % 2 === 0 ? 'below' : 'above'}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PhaseTimeline;
