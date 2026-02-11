'use client';

import { cn } from '@/lib/utils';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface SegmentedProgressProps {
  title?: string;
  value: number;
  max: number;
  valueLabel?: string;
  maxLabel?: string;
  segments: Segment[];
  className?: string;
}

export function SegmentedProgress({
  title,
  value,
  max,
  valueLabel,
  maxLabel,
  segments,
  className,
}: SegmentedProgressProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-5', className)}>
      {title && (
        <p className="text-xs text-muted-foreground mb-3">
          {title}{' '}
          <span className="font-medium text-foreground">{valueLabel || value}</span>
          {' '}of{' '}
          <span className="text-muted-foreground">{maxLabel || max}</span>
        </p>
      )}
      
      {/* Progress Bar - thin and subtle */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/50 gap-px">
        {segments.map((segment, index) => {
          const width = (segment.value / max) * 100;
          if (segment.value === 0) return null;
          return (
            <div
              key={index}
              className="h-full transition-all first:rounded-l-full last:rounded-r-full"
              style={{ 
                width: `${width}%`,
                backgroundColor: segment.color,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
      
      {/* Legend - compact and refined */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color, opacity: 0.85 }}
            />
            <span className="text-xs text-muted-foreground">
              {segment.label}
            </span>
            <span className="text-xs font-medium text-foreground">
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
