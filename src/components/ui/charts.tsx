'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

// ============================================
// Color System - Brand aligned with gradients
// ============================================
const COLORS = {
  blue: { solid: '#1E6CFF', light: '#60A5FA', gradient: ['#1E6CFF', '#60A5FA'] },
  emerald: { solid: '#10B981', light: '#34D399', gradient: ['#10B981', '#6EE7B7'] },
  amber: { solid: '#F59E0B', light: '#FBBF24', gradient: ['#F59E0B', '#FCD34D'] },
  rose: { solid: '#EF4444', light: '#F87171', gradient: ['#EF4444', '#FCA5A5'] },
  violet: { solid: '#8B5CF6', light: '#A78BFA', gradient: ['#8B5CF6', '#C4B5FD'] },
  slate: { solid: '#64748B', light: '#94A3B8', gradient: ['#64748B', '#CBD5E1'] },
  cyan: { solid: '#06B6D4', light: '#22D3EE', gradient: ['#06B6D4', '#67E8F9'] },
};

type ColorKey = keyof typeof COLORS;

// ============================================
// Custom Tooltip Component
// ============================================
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatter?: (value: number) => string;
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-popover/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      {label && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}:</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Custom Legend Component
// ============================================
interface LegendItem {
  name: string;
  color: string;
  value?: number;
}

interface CustomLegendProps {
  items: LegendItem[];
  className?: string;
}

function CustomLegend({ items, className }: CustomLegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <div
          key={item.name}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.name}</span>
          {item.value !== undefined && (
            <span className="font-semibold tabular-nums">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Chart Skeleton/Loading State
// ============================================
interface ChartSkeletonProps {
  type?: 'bar' | 'area' | 'donut';
  className?: string;
}

export function ChartSkeleton({ type = 'bar', className }: ChartSkeletonProps) {
  if (type === 'donut') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="relative">
          <div className="h-32 w-32 animate-pulse rounded-full border-[20px] border-muted" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-end gap-2 px-4', className)}>
      {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-lg bg-muted"
          style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

// ============================================
// Shared Props
// ============================================
interface ChartProps {
  data: Record<string, unknown>[];
  className?: string;
  showAnimation?: boolean;
  isLoading?: boolean;
}

// ============================================
// Area Chart
// ============================================
interface AreaChartProps extends ChartProps {
  index: string;
  categories: string[];
  colors?: ColorKey[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showGradient?: boolean;
  curveType?: 'monotone' | 'linear' | 'natural';
  valueFormatter?: (value: number) => string;
}

export function AreaChart({
  data,
  index,
  categories,
  colors = ['blue'],
  showXAxis = true,
  showYAxis = false,
  showGrid = false,
  showLegend = false,
  showGradient = true,
  showAnimation = true,
  curveType = 'monotone',
  valueFormatter,
  isLoading,
  className,
}: AreaChartProps) {
  const legendItems = useMemo(
    () =>
      categories.map((cat, i) => ({
        name: cat,
        color: COLORS[colors[i] || 'blue'].solid,
      })),
    [categories, colors]
  );

  if (isLoading) {
    return <ChartSkeleton type="area" className={className} />;
  }

  return (
    <div className={cn('w-full h-full flex flex-col gap-3', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            {categories.map((category, i) => {
              const color = COLORS[colors[i] || 'blue'];
              return (
                <linearGradient
                  key={category}
                  id={`gradient-${category}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color.solid} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color.solid} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              vertical={false}
            />
          )}
          {showXAxis && (
            <XAxis
              dataKey={index}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickMargin={8}
            />
          )}
          {showYAxis && (
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickMargin={8}
            />
          )}
          <RechartsTooltip
            content={<CustomTooltip formatter={valueFormatter} />}
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          {categories.map((category, i) => {
            const color = COLORS[colors[i] || 'blue'];
            return (
              <Area
                key={category}
                type={curveType}
                dataKey={category}
                stroke={color.solid}
                fill={showGradient ? `url(#gradient-${category})` : color.solid}
                fillOpacity={showGradient ? 1 : 0.1}
                strokeWidth={2}
                isAnimationActive={showAnimation}
                animationDuration={800}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
      {showLegend && <CustomLegend items={legendItems} />}
    </div>
  );
}

// ============================================
// Bar Chart
// ============================================
interface BarChartProps extends ChartProps {
  index: string;
  categories: string[];
  colors?: ColorKey[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  layout?: 'horizontal' | 'vertical';
  barRadius?: number;
  valueFormatter?: (value: number) => string;
}

export function BarChart({
  data,
  index,
  categories,
  colors = ['blue'],
  showXAxis = true,
  showYAxis = false,
  showGrid = false,
  showLegend = false,
  showAnimation = true,
  layout = 'horizontal',
  barRadius = 6,
  valueFormatter,
  isLoading,
  className,
}: BarChartProps) {
  const legendItems = useMemo(
    () =>
      categories.map((cat, i) => ({
        name: cat,
        color: COLORS[colors[i] || 'blue'].solid,
      })),
    [categories, colors]
  );

  if (isLoading) {
    return <ChartSkeleton type="bar" className={className} />;
  }

  return (
    <div className={cn('w-full h-full flex flex-col gap-3', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, left: layout === 'vertical' ? 0 : -20, bottom: 0 }}
          barCategoryGap="20%"
        >
          <defs>
            {categories.map((category, i) => {
              const color = COLORS[colors[i] || 'blue'];
              return (
                <linearGradient
                  key={category}
                  id={`bar-gradient-${category}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color.light} />
                  <stop offset="100%" stopColor={color.solid} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              horizontal={layout === 'horizontal'}
              vertical={layout === 'vertical'}
            />
          )}
          {layout === 'vertical' ? (
            <>
              <XAxis
                type="number"
                hide={!showXAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                type="category"
                dataKey={index}
                hide={!showYAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={index}
                hide={!showXAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={8}
              />
              <YAxis
                hide={!showYAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
            </>
          )}
          <RechartsTooltip
            content={<CustomTooltip formatter={valueFormatter} />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: barRadius }}
          />
          {categories.map((category) => {
            return (
              <Bar
                key={category}
                dataKey={category}
                fill={`url(#bar-gradient-${category})`}
                radius={barRadius}
                isAnimationActive={showAnimation}
                animationDuration={600}
                animationEasing="ease-out"
                className="transition-opacity hover:opacity-80"
              />
            );
          })}
        </RechartsBarChart>
      </ResponsiveContainer>
      {showLegend && <CustomLegend items={legendItems} />}
    </div>
  );
}

// ============================================
// Donut/Pie Chart
// ============================================
interface DonutChartProps extends ChartProps {
  category: string;
  index: string;
  colors?: ColorKey[];
  showLabel?: boolean;
  showLegend?: boolean;
  centerLabel?: string;
  valueFormatter?: (value: number) => string;
}

export function DonutChart({
  data,
  category,
  index,
  colors = ['blue', 'emerald', 'amber', 'rose', 'slate'],
  showLabel = true,
  showLegend = true,
  showAnimation = true,
  centerLabel,
  valueFormatter,
  isLoading,
  className,
}: DonutChartProps) {
  const total = useMemo(
    () => data.reduce((sum, item) => sum + (Number(item[category]) || 0), 0),
    [data, category]
  );

  const legendItems = useMemo(
    () =>
      data.map((item, i) => ({
        name: String(item[index]),
        color: COLORS[colors[i % colors.length]].solid,
        value: Number(item[category]),
      })),
    [data, index, category, colors]
  );

  if (isLoading) {
    return <ChartSkeleton type="donut" className={className} />;
  }

  return (
    <div className={cn('w-full h-full flex flex-col', className)}>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <defs>
              {data.map((_, i) => {
                const color = COLORS[colors[i % colors.length]];
                return (
                  <linearGradient
                    key={i}
                    id={`donut-gradient-${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color.light} />
                    <stop offset="100%" stopColor={color.solid} />
                  </linearGradient>
                );
              })}
            </defs>
            <Pie
              data={data}
              dataKey={category}
              nameKey={index}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={3}
              strokeWidth={0}
              isAnimationActive={showAnimation}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={`url(#donut-gradient-${i})`}
                  className="transition-opacity hover:opacity-80 cursor-pointer"
                />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip formatter={valueFormatter} />} />
            {showLabel && (
              <>
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {valueFormatter ? valueFormatter(total) : total.toLocaleString()}
                </text>
                {centerLabel && (
                  <text
                    x="50%"
                    y="58%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-xs"
                  >
                    {centerLabel}
                  </text>
                )}
              </>
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      {showLegend && <CustomLegend items={legendItems} className="justify-center pt-2" />}
    </div>
  );
}

// ============================================
// Bar List (horizontal progress bars)
// ============================================
interface BarListItem {
  name: string;
  value: number;
  color?: ColorKey;
  href?: string;
}

interface BarListProps {
  data: BarListItem[];
  className?: string;
  showAnimation?: boolean;
  valueFormatter?: (value: number) => string;
}

export function BarList({
  data,
  className,
  showAnimation = true,
  valueFormatter,
}: BarListProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item) => {
        const color = COLORS[item.color || 'blue'];
        const percentage = (item.value / maxValue) * 100;

        return (
          <div key={item.name} className="group space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {item.name}
              </span>
              <span className="font-semibold tabular-nums">
                {valueFormatter ? valueFormatter(item.value) : item.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: showAnimation ? `${percentage}%` : '0%',
                  background: `linear-gradient(90deg, ${color.solid}, ${color.light})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Sparkline (mini inline chart)
// ============================================
interface SparklineProps {
  data: number[];
  color?: ColorKey;
  className?: string;
  showAnimation?: boolean;
}

export function Sparkline({
  data,
  color = 'blue',
  className,
  showAnimation = true,
}: SparklineProps) {
  const chartData = useMemo(
    () => data.map((value, i) => ({ index: i, value })),
    [data]
  );
  const colorSet = COLORS[color];

  return (
    <div className={cn('h-8 w-24', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorSet.solid} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colorSet.solid} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colorSet.solid}
            fill={`url(#sparkline-${color})`}
            strokeWidth={1.5}
            isAnimationActive={showAnimation}
            animationDuration={500}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// Delta Badge (trend indicator)
// ============================================
interface DeltaBadgeProps {
  value: number;
  className?: string;
  size?: 'sm' | 'default';
}

export function DeltaBadge({ value, className, size = 'default' }: DeltaBadgeProps) {
  const isPositive = value >= 0;
  const isNeutral = value === 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-medium transition-colors',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        isNeutral
          ? 'bg-muted text-muted-foreground'
          : isPositive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
        className
      )}
    >
      <span className={cn(size === 'sm' ? 'text-[8px]' : 'text-[10px]')}>
        {isNeutral ? '→' : isPositive ? '↑' : '↓'}
      </span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ============================================
// Stats Card (metric with chart)
// ============================================
interface StatsCardProps {
  title: string;
  value: string | number;
  delta?: number;
  trend?: number[];
  trendColor?: ColorKey;
  className?: string;
}

export function StatsCard({
  title,
  value,
  delta,
  trend,
  trendColor = 'blue',
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{value}</span>
            {delta !== undefined && <DeltaBadge value={delta} size="sm" />}
          </div>
        </div>
        {trend && <Sparkline data={trend} color={trendColor} />}
      </div>
    </div>
  );
}

// Re-export for convenience
export { CustomLegend, CustomTooltip };
