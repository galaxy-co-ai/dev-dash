'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle,
  FileText,
  RefreshCw,
  Loader2,
  Share2,
  Check,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import styles from './page.module.css';

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
type SOWStatus = 'complete' | 'in_progress' | 'pending' | 'blocked';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phaseId: string | null;
  phaseName: string | null;
  sowDeliverable: string | null;
}

interface Phase {
  id: string;
  name: string;
  tasks: Task[];
}

interface Blocker {
  item: string;
  owner: string;
  impact: string;
}

// Map task status to SOW status for display
function taskStatusToSOWStatus(status: TaskStatus): SOWStatus {
  switch (status) {
    case 'done':
    case 'review': // Review is close enough to complete for SOW purposes
      return 'complete';
    case 'in_progress':
      return 'in_progress';
    case 'backlog':
      return 'blocked'; // Backlog items are typically blocked/waiting
    default:
      return 'pending';
  }
}

function getPhaseStatus(tasks: Task[]): SOWStatus {
  if (tasks.length === 0) return 'pending';
  
  const allComplete = tasks.every(t => t.status === 'done' || t.status === 'review');
  if (allComplete) return 'complete';
  
  const anyInProgress = tasks.some(t => t.status === 'in_progress');
  if (anyInProgress) return 'in_progress';
  
  const anyBlocked = tasks.some(t => t.status === 'backlog' && t.priority === 'high');
  if (anyBlocked) return 'blocked';
  
  return 'pending';
}

// Blockers loaded from config — customize in admin.config.ts
import config from '@/admin.config';
const BLOCKERS: Blocker[] = config.blockers;

function getStatusIcon(status: SOWStatus) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 size={14} />;
    case 'in_progress':
      return <Clock size={14} />;
    case 'blocked':
      return <AlertTriangle size={14} />;
    default:
      return <Circle size={14} />;
  }
}

function getStatusLabel(status: SOWStatus) {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'in_progress':
      return 'In Progress';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Pending';
  }
}

export default function SOWPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSowDialog, setShowSowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/sow/progress`
    : '/sow/progress';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenSharePage = () => {
    window.open(shareUrl, '_blank');
  };

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/tasks');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch {
      // Silent fail - show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Group tasks by phase
  const phases = useMemo(() => {
    const phaseMap = new Map<string, Phase>();
    
    // Only include tasks that have phase information
    const sowTasks = tasks.filter(t => t.phaseId && t.phaseName);
    
    sowTasks.forEach(task => {
      const phaseId = task.phaseId!;
      if (!phaseMap.has(phaseId)) {
        phaseMap.set(phaseId, {
          id: phaseId,
          name: task.phaseName!,
          tasks: [],
        });
      }
      phaseMap.get(phaseId)!.tasks.push(task);
    });

    // Sort phases by ID and return as array
    return Array.from(phaseMap.values()).sort((a, b) => 
      parseInt(a.id) - parseInt(b.id)
    );
  }, [tasks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const sowTasks = tasks.filter(t => t.phaseId);
    const total = sowTasks.length;
    const complete = sowTasks.filter(t => t.status === 'done' || t.status === 'review').length;
    const inProgress = sowTasks.filter(t => t.status === 'in_progress').length;
    const blocked = sowTasks.filter(t => t.status === 'backlog').length;
    const pending = sowTasks.filter(t => t.status === 'todo').length;
    const progress = total > 0 ? Math.round((complete / total) * 100) : 0;

    return { total, complete, inProgress, blocked, pending, progress };
  }, [tasks]);

  const progressSegments = [
    { label: 'Complete', value: stats.complete, color: '#10B981' },
    { label: 'In Progress', value: stats.inProgress, color: '#1E6CFF' },
    { label: 'Pending', value: stats.pending, color: '#F59E0B' },
    { label: 'Blocked', value: stats.blocked, color: '#EF4444' },
  ];

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading SOW data...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className={styles.title}>SOW Tracker</h1>
            <p className={styles.subtitle}>
              MVP B Progress Tracker
              <span className={styles.liveIndicator}>● Live</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className={styles.refreshButton}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowSowDialog(true)}
            className={styles.docLink}
          >
            <FileText size={14} />
            View Full SOW
          </button>
        </div>
      </header>

      {/* SOW Document Dialog */}
      <Dialog open={showSowDialog} onOpenChange={setShowSowDialog}>
        <DialogContent size="md" className="max-h-[65vh]">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start justify-between w-full">
              <div>
                <DialogTitle className="text-xl">{config.project.name} — Scope of Work</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Scope of Work - MVP B</p>
              </div>
              <div className={styles.shareButtons}>
                <button
                  onClick={handleCopyLink}
                  className={`${styles.shareBtn} ${copied ? styles.shareBtnSuccess : ''}`}
                  title="Copy shareable link"
                >
                  {copied ? <Check size={14} /> : <Share2 size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleOpenSharePage}
                  className={styles.openBtn}
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </DialogHeader>
          <DialogBody className="p-6 overflow-y-auto">
            {/* Phases */}
            <section className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Deliverables by Phase</h3>
              <div className="space-y-4">
                {phases.map((phase) => {
                  const phaseComplete = phase.tasks.filter(t => t.status === 'done' || t.status === 'review').length;
                  const phaseTotal = phase.tasks.length;
                  const phaseProgress = phaseTotal > 0 ? Math.round((phaseComplete / phaseTotal) * 100) : 0;
                  const phaseStatus = getPhaseStatus(phase.tasks);
                  
                  return (
                    <div key={phase.id} className="border rounded-lg overflow-hidden">
                      {/* Phase Header */}
                      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground">Phase {phase.id}</span>
                          <span className="font-medium">{phase.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${phaseProgress}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {phaseComplete}/{phaseTotal}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            phaseStatus === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                            phaseStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            phaseStatus === 'blocked' ? 'bg-rose-100 text-rose-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {getStatusLabel(phaseStatus)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Tasks as Deliverables */}
                      <div className="divide-y">
                        {phase.tasks.map((task) => {
                          const sowStatus = taskStatusToSOWStatus(task.status);
                          return (
                            <div 
                              key={task.id}
                              className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                            >
                              <span className={`flex-shrink-0 ${
                                sowStatus === 'complete' ? 'text-emerald-500' :
                                sowStatus === 'in_progress' ? 'text-blue-500' :
                                sowStatus === 'blocked' ? 'text-rose-500' :
                                'text-muted-foreground'
                              }`}>
                                {getStatusIcon(sowStatus)}
                              </span>
                              <span className={`flex-1 text-sm ${
                                sowStatus === 'complete' ? 'text-muted-foreground' : ''
                              }`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {task.description}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Blockers */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500" />
                Active Blockers
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Item</span>
                  <span>Owner</span>
                  <span>Impact</span>
                </div>
                <div className="divide-y">
                  {BLOCKERS.map((blocker, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                      <span className="font-medium">{blocker.item}</span>
                      <span className="text-amber-600">{blocker.owner}</span>
                      <span className="text-muted-foreground">{blocker.impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Overall Progress - Segmented */}
      <SegmentedProgress
        title="Project Progress"
        value={stats.complete}
        max={stats.total}
        valueLabel={`${stats.progress}% Complete`}
        maxLabel={`${stats.total} deliverables`}
        segments={progressSegments}
        className="mb-6"
      />

      {/* Phases Grid */}
      <div className={styles.phasesGrid}>
        {phases.map((phase) => {
          const phaseComplete = phase.tasks.filter(t => t.status === 'done' || t.status === 'review').length;
          const phaseProgress = phase.tasks.length > 0 
            ? Math.round((phaseComplete / phase.tasks.length) * 100) 
            : 0;
          const phaseStatus = getPhaseStatus(phase.tasks);
          
          return (
            <div key={phase.id} className={`${styles.phaseCard} ${styles[`phase_${phaseStatus}`]}`}>
              <div className={styles.phaseHeader}>
                <span className={styles.phaseNumber}>Phase {phase.id}</span>
                <span className={`${styles.phaseBadge} ${styles[`badge_${phaseStatus}`]}`}>
                  {getStatusIcon(phaseStatus)}
                  {getStatusLabel(phaseStatus)}
                </span>
              </div>
              
              <h3 className={styles.phaseName}>{phase.name}</h3>
              
              <div className={styles.phaseProgress}>
                <div className={styles.phaseProgressBar}>
                  <div 
                    className={styles.phaseProgressFill} 
                    style={{ width: `${phaseProgress}%` }}
                  />
                </div>
                <span className={styles.phaseProgressText}>
                  {phaseComplete}/{phase.tasks.length}
                </span>
              </div>
              
              <ul className={styles.deliverablesList}>
                {phase.tasks.map((task) => {
                  const sowStatus = taskStatusToSOWStatus(task.status);
                  return (
                    <li 
                      key={task.id} 
                      className={`${styles.deliverable} ${styles[`deliverable_${sowStatus}`]}`}
                    >
                      <span className={styles.deliverableIcon}>
                        {getStatusIcon(sowStatus)}
                      </span>
                      <span className={styles.deliverableName}>{task.title}</span>
                      {task.description && (
                        <span className={styles.deliverableNote}>{task.description}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Blockers Section */}
      <div className={styles.blockersSection}>
        <h2 className={styles.sectionTitle}>
          <AlertTriangle size={18} />
          Blockers
        </h2>
        <div className={styles.blockersTable}>
          <div className={styles.blockersHeader}>
            <span>Item</span>
            <span>Owner</span>
            <span>Impact</span>
          </div>
          {BLOCKERS.map((blocker, idx) => (
            <div key={idx} className={styles.blockerRow}>
              <span className={styles.blockerItem}>{blocker.item}</span>
              <span className={styles.blockerOwner}>{blocker.owner}</span>
              <span className={styles.blockerImpact}>{blocker.impact}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
