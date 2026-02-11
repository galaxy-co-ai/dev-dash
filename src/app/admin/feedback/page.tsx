'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bug, 
  Lightbulb, 
  MessageCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Zap,
  CheckSquare,
  Square,
  ArrowUpRight,
  XCircle,
  AlertTriangle,
  Circle,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DonutChart, BarList } from '@/components/ui/charts';
import { toast } from 'sonner';
import { staggerContainer, cardItem, fadeInUp } from '@/lib/animation-variants';
import styles from './page.module.css';

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackUserContext {
  viewportWidth?: number;
  viewportHeight?: number;
  scrollPosition?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  referrer?: string;
  timeOnPage?: number;
  interactionCount?: number;
  lastAction?: string;
}

interface TargetElementInfo {
  selector?: string;
  tagName?: string;
  className?: string;
  id?: string;
  text?: string;
  rect?: { x: number; y: number; width: number; height: number };
}

interface FeedbackItem {
  id: string;
  reason: 'bug' | 'suggestion' | 'general';
  subOption: string;
  customReason: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes: string | null;
  page: string;
  targetElement: string | null;
  targetElementInfo: TargetElementInfo | null;
  sessionId: string | null;
  quoteId: string | null;
  userId: string | null;
  userAgent: string | null;
  userContext: FeedbackUserContext | null;
  feedbackTimestamp: string;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'wont_fix';
  adminNotes: string | null;
  resolvedAt: string | null;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TodoItem {
  id: string;
  feedbackId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'done';
  reason: 'bug' | 'suggestion' | 'general';
  page: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

type TabType = 'insights' | 'todos' | 'tickets';

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: '#EF4444', icon: AlertCircle },
  { value: 'reviewed', label: 'Reviewed', color: '#3B82F6', icon: CheckCircle2 },
  { value: 'in_progress', label: 'In Progress', color: '#F59E0B', icon: Clock },
  { value: 'resolved', label: 'Resolved', color: '#22C55E', icon: CheckCircle2 },
  { value: 'wont_fix', label: "Won't Fix", color: '#6B7280', icon: XCircle },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#DC2626' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'medium', label: 'Medium', color: '#EAB308' },
  { value: 'low', label: 'Low', color: '#22C55E' },
];

const REASON_ICONS = {
  bug: Bug,
  suggestion: Lightbulb,
  general: MessageCircle,
};

const REASON_LABELS = {
  bug: "Something's broken",
  suggestion: 'Feature idea',
  general: 'General feedback',
};

const REASON_COLORS = {
  bug: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' },
  suggestion: { bg: 'rgba(168, 85, 247, 0.1)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.2)' },
  general: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
};

// =============================================================================
// UTILITIES
// =============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function formatSubOption(subOption: string): string {
  return subOption
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDeviceIcon(deviceType?: string) {
  switch (deviceType) {
    case 'mobile': return Smartphone;
    case 'tablet': return Tablet;
    default: return Monitor;
  }
}

function generateTodosFromFeedback(feedback: FeedbackItem[]): TodoItem[] {
  // AI-like logic: auto-generate todos for bugs and high-priority items
  return feedback
    .filter(f => {
      // Auto-create todos for:
      // 1. All bugs (something is broken)
      // 2. High/critical priority items
      // 3. Feature suggestions that are actionable
      if (f.reason === 'bug') return true;
      if (f.priority === 'critical' || f.priority === 'high') return true;
      if (f.reason === 'suggestion' && f.subOption !== 'other') return true;
      return false;
    })
    .filter(f => f.status !== 'resolved' && f.status !== 'wont_fix')
    .map(f => ({
      id: `todo-${f.id}`,
      feedbackId: f.id,
      title: f.customReason || formatSubOption(f.subOption),
      description: f.notes || `${REASON_LABELS[f.reason]} on ${f.page}`,
      priority: f.priority,
      status: f.status === 'in_progress' ? 'in_progress' as const : 'pending' as const,
      reason: f.reason,
      page: f.page,
      createdAt: f.createdAt,
    }));
}

// =============================================================================
// COMPONENTS
// =============================================================================

function TabBar({ 
  activeTab, 
  onTabChange,
  counts,
}: { 
  activeTab: TabType; 
  onTabChange: (tab: TabType) => void;
  counts: { insights: number; todos: number; tickets: number };
}) {
  const tabs = [
    { id: 'insights' as const, label: 'Insights', icon: BarChart3, count: null },
    { id: 'todos' as const, label: "To Do's", icon: CheckSquare, count: counts.todos },
    { id: 'tickets' as const, label: 'Tickets', icon: MessageCircle, count: counts.tickets },
  ];

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <tab.icon size={16} />
          <span>{tab.label}</span>
          {tab.count !== null && tab.count > 0 && (
            <span className={styles.tabBadge}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: typeof BarChart3;
  color: string;
}) {
  return (
    <motion.div variants={cardItem}>
      <Card className={styles.metricCard}>
        <div className={styles.metricIcon} style={{ background: `${color}15`, color }}>
          <Icon size={20} />
        </div>
        <div className={styles.metricContent}>
          <span className={styles.metricTitle}>{title}</span>
          <div className={styles.metricValueRow}>
            <span className={styles.metricValue}>{value}</span>
            {change && (
              <span className={`${styles.metricChange} ${styles[`change_${changeType}`]}`}>
                {changeType === 'positive' && <TrendingUp size={12} />}
                {changeType === 'negative' && <TrendingDown size={12} />}
                {change}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function InsightsTab({ feedback }: { feedback: FeedbackItem[] }) {
  const analytics = useMemo(() => {
    const total = feedback.length;
    const byStatus = {
      new: feedback.filter(f => f.status === 'new').length,
      reviewed: feedback.filter(f => f.status === 'reviewed').length,
      in_progress: feedback.filter(f => f.status === 'in_progress').length,
      resolved: feedback.filter(f => f.status === 'resolved').length,
      wont_fix: feedback.filter(f => f.status === 'wont_fix').length,
    };
    const byReason = {
      bug: feedback.filter(f => f.reason === 'bug').length,
      suggestion: feedback.filter(f => f.reason === 'suggestion').length,
      general: feedback.filter(f => f.reason === 'general').length,
    };
    const byPriority = {
      critical: feedback.filter(f => f.priority === 'critical').length,
      high: feedback.filter(f => f.priority === 'high').length,
      medium: feedback.filter(f => f.priority === 'medium').length,
      low: feedback.filter(f => f.priority === 'low').length,
    };
    const resolutionRate = total > 0 
      ? Math.round(((byStatus.resolved + byStatus.wont_fix) / total) * 100) 
      : 0;
    const avgResponseTime = '2.4h'; // Would be calculated from actual data

    // Pages with most feedback
    const pageFrequency = feedback.reduce((acc, f) => {
      acc[f.page] = (acc[f.page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topPages = Object.entries(pageFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return { total, byStatus, byReason, byPriority, resolutionRate, avgResponseTime, topPages };
  }, [feedback]);

  const statusChartData = useMemo(() => [
    { name: 'New', value: analytics.byStatus.new },
    { name: 'Reviewed', value: analytics.byStatus.reviewed },
    { name: 'In Progress', value: analytics.byStatus.in_progress },
    { name: 'Resolved', value: analytics.byStatus.resolved },
    { name: "Won't Fix", value: analytics.byStatus.wont_fix },
  ].filter(d => d.value > 0), [analytics.byStatus]);

  const reasonBarData = useMemo(() => [
    { name: 'Bug Reports', value: analytics.byReason.bug, color: 'rose' as const },
    { name: 'Feature Ideas', value: analytics.byReason.suggestion, color: 'violet' as const },
    { name: 'General Feedback', value: analytics.byReason.general, color: 'blue' as const },
  ].sort((a, b) => b.value - a.value), [analytics.byReason]);

  const priorityData = useMemo(() => [
    { name: 'Critical', value: analytics.byPriority.critical, color: 'rose' as const },
    { name: 'High', value: analytics.byPriority.high, color: 'violet' as const },
    { name: 'Medium', value: analytics.byPriority.medium, color: 'amber' as const },
    { name: 'Low', value: analytics.byPriority.low, color: 'emerald' as const },
  ].filter(d => d.value > 0), [analytics.byPriority]);

  return (
    <motion.div 
      className={styles.insightsGrid}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Key Metrics Row */}
      <div className={styles.metricsRow}>
        <MetricCard
          title="Total Feedback"
          value={analytics.total}
          icon={MessageCircle}
          color="#3B82F6"
        />
        <MetricCard
          title="Needs Attention"
          value={analytics.byStatus.new}
          change={analytics.byStatus.new > 0 ? `${analytics.byStatus.new} new` : undefined}
          changeType={analytics.byStatus.new > 3 ? 'negative' : 'neutral'}
          icon={AlertCircle}
          color="#EF4444"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${analytics.resolutionRate}%`}
          change="+5%"
          changeType="positive"
          icon={Target}
          color="#22C55E"
        />
        <MetricCard
          title="Avg Response"
          value={analytics.avgResponseTime}
          icon={Zap}
          color="#8B5CF6"
        />
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Status Distribution */}
        <motion.div variants={cardItem}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                <PieChart size={16} />
                Status Distribution
              </h3>
              <div className={styles.chartBadge}>
                <span className={styles.chartBadgeLabel}>Resolution</span>
                <Progress value={analytics.resolutionRate} className="w-16 h-1.5" />
                <span className={styles.chartBadgeValue}>{analytics.resolutionRate}%</span>
              </div>
            </div>
            {statusChartData.length > 0 ? (
              <DonutChart
                data={statusChartData}
                category="value"
                index="name"
                colors={['rose', 'blue', 'amber', 'emerald', 'slate']}
                className="h-44"
              />
            ) : (
              <div className={styles.chartEmpty}>No data yet</div>
            )}
          </Card>
        </motion.div>

        {/* Feedback by Type */}
        <motion.div variants={cardItem}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                <BarChart3 size={16} />
                Feedback by Type
              </h3>
            </div>
            {reasonBarData.length > 0 ? (
              <BarList data={reasonBarData} className="mt-4" />
            ) : (
              <div className={styles.chartEmpty}>No data yet</div>
            )}
          </Card>
        </motion.div>

        {/* Priority Breakdown */}
        <motion.div variants={cardItem}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                <AlertTriangle size={16} />
                Priority Breakdown
              </h3>
            </div>
            {priorityData.length > 0 ? (
              <DonutChart
                data={priorityData}
                category="value"
                index="name"
                colors={['rose', 'violet', 'amber', 'emerald']}
                className="h-44"
              />
            ) : (
              <div className={styles.chartEmpty}>No data yet</div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className={styles.bottomRow}>
        {/* Top Pages */}
        <motion.div variants={cardItem}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                <Target size={16} />
                Top Pages by Feedback
              </h3>
            </div>
            <div className={styles.pagesList}>
              {analytics.topPages.map((page, idx) => (
                <div key={page.name} className={styles.pageItem}>
                  <span className={styles.pageRank}>{idx + 1}</span>
                  <span className={styles.pagePath}>{page.name}</span>
                  <span className={styles.pageCount}>{page.value}</span>
                </div>
              ))}
              {analytics.topPages.length === 0 && (
                <div className={styles.chartEmpty}>No page data</div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={cardItem}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                <Sparkles size={16} />
                Quick Stats
              </h3>
            </div>
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>Bugs</span>
                <span className={styles.quickStatValue} style={{ color: '#EF4444' }}>
                  {analytics.byReason.bug}
                </span>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>Features</span>
                <span className={styles.quickStatValue} style={{ color: '#A855F7' }}>
                  {analytics.byReason.suggestion}
                </span>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>In Progress</span>
                <span className={styles.quickStatValue} style={{ color: '#F59E0B' }}>
                  {analytics.byStatus.in_progress}
                </span>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.quickStatLabel}>Critical</span>
                <span className={styles.quickStatValue} style={{ color: '#DC2626' }}>
                  {analytics.byPriority.critical}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TodosTab({ 
  todos, 
  onStatusChange,
}: { 
  todos: TodoItem[];
  onStatusChange: (feedbackId: string, status: string) => void;
}) {
  const groupedTodos = useMemo(() => {
    const pending = todos.filter(t => t.status === 'pending');
    const inProgress = todos.filter(t => t.status === 'in_progress');
    return { pending, inProgress };
  }, [todos]);

  if (todos.length === 0) {
    return (
      <motion.div 
        className={styles.emptyState}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.emptyIcon}>
          <Sparkles size={48} />
        </div>
        <h3>All caught up!</h3>
        <p>No action items right now. New tasks will appear automatically when feedback requires attention.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={styles.todosContainer}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* AI Notice */}
      <motion.div className={styles.aiNotice} variants={fadeInUp}>
        <Sparkles size={16} />
        <span>Tasks are auto-generated from feedback that requires action. No manual conversion needed.</span>
      </motion.div>

      {/* In Progress */}
      {groupedTodos.inProgress.length > 0 && (
        <motion.section className={styles.todoSection} variants={fadeInUp}>
          <h3 className={styles.todoSectionTitle}>
            <Clock size={16} className="text-amber-500" />
            In Progress ({groupedTodos.inProgress.length})
          </h3>
          <div className={styles.todoList}>
            {groupedTodos.inProgress.map((todo) => (
              <TodoCard 
                key={todo.id} 
                todo={todo} 
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Pending */}
      {groupedTodos.pending.length > 0 && (
        <motion.section className={styles.todoSection} variants={fadeInUp}>
          <h3 className={styles.todoSectionTitle}>
            <Circle size={16} className="text-slate-400" />
            Pending ({groupedTodos.pending.length})
          </h3>
          <div className={styles.todoList}>
            {groupedTodos.pending.map((todo) => (
              <TodoCard 
                key={todo.id} 
                todo={todo}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}

function TodoCard({ 
  todo,
  onStatusChange,
}: { 
  todo: TodoItem;
  onStatusChange: (feedbackId: string, status: string) => void;
}) {
  const ReasonIcon = REASON_ICONS[todo.reason];
  const priorityOption = PRIORITY_OPTIONS.find(p => p.value === todo.priority);

  return (
    <motion.div 
      className={styles.todoCard}
      variants={cardItem}
      whileHover={{ scale: 1.01 }}
    >
      <button
        className={styles.todoCheckbox}
        onClick={() => onStatusChange(todo.feedbackId, 'resolved')}
        aria-label="Mark as done"
      >
        <Square size={18} />
      </button>
      <div className={styles.todoContent}>
        <div className={styles.todoHeader}>
          <span className={styles.todoTitle}>{todo.title}</span>
          <div className={styles.todoTags}>
            <span 
              className={styles.priorityTag}
              style={{ 
                background: `${priorityOption?.color}15`,
                color: priorityOption?.color,
              }}
            >
              {priorityOption?.label}
            </span>
            <span 
              className={styles.reasonTag}
              style={{ 
                background: REASON_COLORS[todo.reason].bg,
                color: REASON_COLORS[todo.reason].text,
              }}
            >
              <ReasonIcon size={12} />
              {todo.reason}
            </span>
          </div>
        </div>
        <p className={styles.todoDescription}>{todo.description}</p>
        <div className={styles.todoMeta}>
          <span className={styles.todoPage}>
            <ExternalLink size={12} />
            {todo.page}
          </span>
          <span className={styles.todoTime}>{formatRelativeTime(todo.createdAt)}</span>
        </div>
      </div>
      <button
        className={styles.todoStartBtn}
        onClick={() => onStatusChange(todo.feedbackId, 'in_progress')}
        aria-label="Start working"
      >
        <ArrowUpRight size={16} />
      </button>
    </motion.div>
  );
}

function TicketsTab({
  feedback,
  expandedId,
  selectedIds,
  onToggleExpand,
  onToggleSelect,
  onSelectAll: _onSelectAll,
  onStatusChange,
  onPriorityChange,
  onAdminNotesChange,
  updatingId,
  savingNotes,
}: {
  feedback: FeedbackItem[];
  expandedId: string | null;
  selectedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onPriorityChange: (id: string, priority: string) => Promise<void>;
  onAdminNotesChange: (id: string, notes: string) => Promise<void>;
  updatingId: string | null;
  savingNotes: string | null;
}) {
  // Group by reason (category)
  const grouped = useMemo(() => {
    const bugs = feedback.filter(f => f.reason === 'bug');
    const suggestions = feedback.filter(f => f.reason === 'suggestion');
    const general = feedback.filter(f => f.reason === 'general');
    return { bugs, suggestions, general };
  }, [feedback]);

  const categories = [
    { 
      id: 'bug', 
      title: 'Bug Reports', 
      items: grouped.bugs, 
      icon: Bug, 
      color: REASON_COLORS.bug,
      emptyMessage: 'No bugs reported',
    },
    { 
      id: 'suggestion', 
      title: 'Feature Ideas', 
      items: grouped.suggestions, 
      icon: Lightbulb, 
      color: REASON_COLORS.suggestion,
      emptyMessage: 'No feature requests',
    },
    { 
      id: 'general', 
      title: 'General Feedback', 
      items: grouped.general, 
      icon: MessageCircle, 
      color: REASON_COLORS.general,
      emptyMessage: 'No general feedback',
    },
  ];

  return (
    <motion.div 
      className={styles.ticketsContainer}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div 
          className={styles.bulkBar}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span>{selectedIds.size} selected</span>
          <div className={styles.bulkActions}>
            <button onClick={() => {}}>Mark Reviewed</button>
            <button onClick={() => {}}>Mark Resolved</button>
            <button onClick={() => {}}>Set Priority</button>
          </div>
        </motion.div>
      )}

      {categories.map((category) => (
        <motion.section 
          key={category.id} 
          className={styles.categorySection}
          variants={fadeInUp}
        >
          <div className={styles.categoryHeader}>
            <div className={styles.categoryTitle}>
              <div 
                className={styles.categoryIcon}
                style={{ background: category.color.bg, color: category.color.text }}
              >
                <category.icon size={16} />
              </div>
              <h3>{category.title}</h3>
              <span className={styles.categoryCount}>{category.items.length}</span>
            </div>
          </div>

          {category.items.length === 0 ? (
            <div className={styles.categoryEmpty}>
              <category.icon size={24} style={{ color: category.color.text, opacity: 0.5 }} />
              <span>{category.emptyMessage}</span>
            </div>
          ) : (
            <div className={styles.ticketsList}>
              {category.items.map((item) => (
                <TicketCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  isSelected={selectedIds.has(item.id)}
                  onToggleExpand={() => onToggleExpand(item.id)}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onStatusChange={onStatusChange}
                  onPriorityChange={onPriorityChange}
                  onAdminNotesChange={onAdminNotesChange}
                  isUpdating={updatingId === item.id}
                  isSavingNotes={savingNotes === item.id}
                />
              ))}
            </div>
          )}
        </motion.section>
      ))}
    </motion.div>
  );
}

function TicketCard({
  item,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onStatusChange,
  onPriorityChange,
  onAdminNotesChange,
  isUpdating,
  isSavingNotes,
}: {
  item: FeedbackItem;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onPriorityChange: (id: string, priority: string) => Promise<void>;
  onAdminNotesChange: (id: string, notes: string) => Promise<void>;
  isUpdating: boolean;
  isSavingNotes: boolean;
}) {
  const [localNotes, setLocalNotes] = useState(item.adminNotes || '');
  const statusOption = STATUS_OPTIONS.find(s => s.value === item.status);
  const priorityOption = PRIORITY_OPTIONS.find(p => p.value === item.priority);
  const DeviceIcon = getDeviceIcon(item.userContext?.deviceType);

  const handleNotesBlur = async () => {
    if (localNotes !== (item.adminNotes || '')) {
      await onAdminNotesChange(item.id, localNotes);
    }
  };

  return (
    <motion.div 
      className={`${styles.ticketCard} ${isExpanded ? styles.ticketExpanded : ''}`}
      variants={cardItem}
    >
      {/* Header */}
      <div className={styles.ticketHeader}>
        <button
          className={styles.ticketCheckbox}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>

        <button className={styles.ticketMain} onClick={onToggleExpand}>
          <div className={styles.ticketInfo}>
            <span className={styles.ticketTitle}>
              {item.customReason || formatSubOption(item.subOption)}
            </span>
            <span className={styles.ticketMeta}>
              {item.page}
              {item.targetElement && (
                <span className={styles.targetBadge}>
                  <Target size={10} />
                  Element targeted
                </span>
              )}
              <span className={styles.ticketTime}>{formatRelativeTime(item.feedbackTimestamp)}</span>
            </span>
          </div>

          <div className={styles.ticketBadges}>
            <span 
              className={styles.priorityBadge}
              style={{ background: `${priorityOption?.color}20`, color: priorityOption?.color }}
            >
              {priorityOption?.label}
            </span>
            <span 
              className={styles.statusBadge}
              style={{ background: `${statusOption?.color}20`, color: statusOption?.color }}
            >
              {statusOption?.label}
            </span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className={styles.ticketBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* User Notes */}
            {item.notes && (
              <div className={styles.ticketSection}>
                <label className={styles.sectionLabel}>User Notes</label>
                <p className={styles.userNotes}>{item.notes}</p>
              </div>
            )}

            {/* Target Element */}
            {item.targetElement && (
              <div className={styles.ticketSection}>
                <label className={styles.sectionLabel}>Targeted Element</label>
                <code className={styles.targetCode}>{item.targetElement}</code>
              </div>
            )}

            {/* Context Info */}
            {item.userContext && (
              <div className={styles.ticketSection}>
                <label className={styles.sectionLabel}>User Context</label>
                <div className={styles.contextGrid}>
                  <div className={styles.contextItem}>
                    <DeviceIcon size={14} />
                    <span>{item.userContext.deviceType || 'Unknown'}</span>
                  </div>
                  {item.userContext.browserName && (
                    <div className={styles.contextItem}>
                      <Monitor size={14} />
                      <span>{item.userContext.browserName}</span>
                    </div>
                  )}
                  {item.userContext.viewportWidth && (
                    <div className={styles.contextItem}>
                      <span>{item.userContext.viewportWidth}×{item.userContext.viewportHeight}</span>
                    </div>
                  )}
                  {item.userContext.timeOnPage && (
                    <div className={styles.contextItem}>
                      <Clock size={14} />
                      <span>{Math.round(item.userContext.timeOnPage)}s on page</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Priority */}
            <div className={styles.ticketSection}>
              <label className={styles.sectionLabel}>Priority</label>
              <div className={styles.priorityButtons}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`${styles.priorityButton} ${item.priority === opt.value ? styles.priorityActive : ''}`}
                    style={{ '--priority-color': opt.color } as React.CSSProperties}
                    onClick={() => onPriorityChange(item.id, opt.value)}
                    disabled={isUpdating}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className={styles.ticketSection}>
              <label className={styles.sectionLabel}>Status</label>
              <div className={styles.statusButtons}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`${styles.statusButton} ${item.status === opt.value ? styles.statusActive : ''}`}
                    style={{ '--status-color': opt.color } as React.CSSProperties}
                    onClick={() => onStatusChange(item.id, opt.value)}
                    disabled={isUpdating}
                  >
                    {isUpdating && item.status !== opt.value ? (
                      <Loader2 size={12} className={styles.spinner} />
                    ) : (
                      opt.label
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div className={styles.ticketSection}>
              <label className={styles.sectionLabel}>
                Admin Notes
                {isSavingNotes && (
                  <span className={styles.savingIndicator}>
                    <Loader2 size={12} className={styles.spinner} />
                    Saving...
                  </span>
                )}
                {!isSavingNotes && localNotes !== (item.adminNotes || '') && (
                  <span className={styles.unsavedIndicator}>Unsaved</span>
                )}
              </label>
              <textarea
                className={styles.adminNotes}
                placeholder="Add notes about this feedback..."
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
              />
            </div>

            {/* Page Link */}
            <div className={styles.ticketSection}>
              <a 
                href={item.page} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.pageLink}
              >
                <ExternalLink size={14} />
                Open {item.page}
              </a>
            </div>

            {/* Metadata */}
            <div className={styles.ticketMetadata}>
              <span>ID: {item.id.slice(0, 8)}...</span>
              {item.sessionId && <span>Session: {item.sessionId.slice(0, 8)}...</span>}
              {item.resolvedAt && <span>Resolved: {formatDate(item.resolvedAt)}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function FeedbackPage() {
  // toast imported from 'sonner' at module level
  
  // Data state
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('insights');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  
  // Operation state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  // Fetch feedback - separate from toast to avoid infinite loop
  const fetchFeedback = useCallback(async (showToastOnError = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      
      const response = await fetch(`/api/admin/feedback?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setFeedback(data.feedback || []);
      setPagination(data.pagination || null);
    } catch {
      const message = 'Could not load feedback. Please try again.';
      setError(message);
      // Only show toast on manual refresh to avoid flooding
      if (showToastOnError) {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, searchQuery]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);
  
  // Set up auto-refresh separately to avoid re-running on filter changes
  useEffect(() => {
    const interval = setInterval(() => fetchFeedback(), 120000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate todos from feedback
  const todos = useMemo(() => generateTodosFromFeedback(feedback), [feedback]);

  // Counts for tab badges
  const counts = useMemo(() => ({
    insights: feedback.length,
    todos: todos.length,
    tickets: feedback.filter(f => f.status === 'new').length,
  }), [feedback, todos]);

  // Status change handler
  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      const { feedback: updated } = await response.json();
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Could not update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Priority change handler
  const handlePriorityChange = async (id: string, newPriority: string) => {
    setUpdatingId(id);
    
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      const { feedback: updated } = await response.json();
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
      toast.success('Priority updated');
    } catch {
      toast.error('Could not update priority. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Admin notes handler with visual feedback
  const handleAdminNotesChange = async (id: string, adminNotes: string) => {
    setSavingNotes(id);
    
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      const { feedback: updated } = await response.json();
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
      toast.success('Notes saved');
    } catch {
      toast.error('Could not save notes. Please try again.');
    } finally {
      setSavingNotes(null);
    }
  };

  // Selection handlers
  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === feedback.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(feedback.map(f => f.id)));
    }
  };

  return (
    <motion.div 
      className={styles.page}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.header className={styles.header} variants={fadeInUp}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <MessageCircle size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Feedback</h1>
            <p className={styles.subtitle}>
              User feedback, bug reports, and feature requests
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={() => fetchFeedback(true)} 
            className={styles.refreshButton} 
            aria-label="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? styles.spinner : ''} />
          </button>
        </div>
      </motion.header>

      {/* Tab Bar */}
      <motion.div variants={fadeInUp}>
        <TabBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          counts={counts}
        />
      </motion.div>

      {/* Search & Filters (only show on Tickets tab) */}
      {activeTab === 'tickets' && (
        <motion.div className={styles.filtersRow} variants={fadeInUp}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading feedback...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => fetchFeedback(true)}>Retry</button>
        </div>
      )}

      {/* Tab Content */}
      {!isLoading && !error && (
        <AnimatePresence mode="wait">
          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <InsightsTab feedback={feedback} />
            </motion.div>
          )}
          
          {activeTab === 'todos' && (
            <motion.div
              key="todos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TodosTab 
                todos={todos}
                onStatusChange={handleStatusChange}
              />
            </motion.div>
          )}
          
          {activeTab === 'tickets' && (
            <motion.div
              key="tickets"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TicketsTab
                feedback={feedback}
                expandedId={expandedId}
                selectedIds={selectedIds}
                onToggleExpand={toggleExpanded}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAdminNotesChange={handleAdminNotesChange}
                updatingId={updatingId}
                savingNotes={savingNotes}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {pagination && pagination.hasMore && activeTab === 'tickets' && (
        <motion.div className={styles.pagination} variants={fadeInUp}>
          <span>
            Showing {feedback.length} of {pagination.total}
          </span>
          <button onClick={() => {/* Load more */}}>
            Load More
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
