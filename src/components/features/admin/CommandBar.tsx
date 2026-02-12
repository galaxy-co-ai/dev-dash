'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scan,
  RefreshCw,
  Sparkles,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ChevronRight,
  ListChecks,
  Plus,
  Command as CommandIcon,
  Zap,
  ClipboardList,
  BarChart3,
  Bot,
  Cloud,
  Check,
  Send,
  MessageCircle,
  Minimize2,
  Brain,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useProject } from '@/app/admin/[slug]/ProjectContext';
import styles from './CommandBar.module.css';

type ExecutionMode = 'api' | 'cursor';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CommandResult {
  success: boolean;
  title: string;
  summary: string;
  details?: string[];
  suggestions?: string[];
}

interface CommandBarProps {
  onRefreshTasks?: () => void;
  onAddTask?: () => void;
}

// Pre-built prompts for Cursor Agent mode — loaded from config
import { cursorPrompts } from '@/admin.config';
const CURSOR_PROMPTS: Record<string, { name: string; prompt: string }> = cursorPrompts;

// Quick prompts for chat
const QUICK_PROMPTS = [
  { label: 'What should I work on next?', icon: Sparkles },
  { label: 'Summarize project status', icon: FileSearch },
  { label: 'Find blockers', icon: AlertTriangle },
];

export function CommandBar({ onRefreshTasks, onAddTask }: CommandBarProps) {
  const { project } = useProject();
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('cursor');
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen]);

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (mode === 'api') {
          setChatOpen((open) => !open);
        } else {
          setOpen((open) => !open);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [mode]);

  const copyToClipboard = useCallback(async (text: string, promptName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopiedPrompt(promptName);
      setTimeout(() => {
        setCopied(false);
        setCopiedPrompt(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const sendChatMessage = useCallback(async (messageText?: string) => {
    const text = messageText || chatInput.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          messages: [...chatMessages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${data.error || 'Something went wrong'}` 
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error instanceof Error ? error.message : 'Connection failed'}` 
      }]);
    } finally {
      setIsSending(false);
    }
  }, [chatInput, chatMessages, isSending]);

  const runCommand = useCallback(async (
    endpoint: string,
    cursorPromptKey?: string,
    successCallback?: () => void
  ) => {
    setOpen(false);

    // Cursor Agent mode - copy prompt to clipboard
    if (mode === 'cursor' && cursorPromptKey && CURSOR_PROMPTS[cursorPromptKey]) {
      const prompt = CURSOR_PROMPTS[cursorPromptKey];
      await copyToClipboard(prompt.prompt, prompt.name);
      setResult({
        success: true,
        title: `${prompt.name} Prompt Copied`,
        summary: 'Paste this prompt into Cursor chat to run with full codebase access.',
        suggestions: ['Press Cmd+V (or Ctrl+V) in Cursor chat', 'Claude will execute with full context'],
      });
      setShowResult(true);
      return;
    }

    // API mode - make server request
    setIsRunning(true);
    setResult(null);
    setShowResult(false);

    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      setResult(data);
      setShowResult(true);
      
      if (successCallback) {
        successCallback();
      }
    } catch (error) {
      setResult({
        success: false,
        title: 'Command Failed',
        summary: 'An error occurred while running the command.',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      });
      setShowResult(true);
    } finally {
      setIsRunning(false);
    }
  }, [mode, copyToClipboard]);

  const handleAddTask = () => {
    setOpen(false);
    onAddTask?.();
  };

  const toggleMode = () => {
    const newMode = mode === 'api' ? 'cursor' : 'api';
    setMode(newMode);
    // Open chat when switching to API mode
    if (newMode === 'api') {
      setChatOpen(true);
    } else {
      setChatOpen(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const [isSavingMemories, setIsSavingMemories] = useState(false);
  const [memorySaveResult, setMemorySaveResult] = useState<{ success: boolean; count: number } | null>(null);

  const saveMemories = useCallback(async () => {
    if (chatMessages.length < 2 || isSavingMemories) return;

    setIsSavingMemories(true);
    setMemorySaveResult(null);

    try {
      const response = await fetch('/api/admin/ai/memories/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      setMemorySaveResult({ success: data.success, count: data.extracted || 0 });
      
      // Clear result after 3 seconds
      setTimeout(() => setMemorySaveResult(null), 3000);
    } catch {
      setMemorySaveResult({ success: false, count: 0 });
      setTimeout(() => setMemorySaveResult(null), 3000);
    } finally {
      setIsSavingMemories(false);
    }
  }, [chatMessages, isSavingMemories]);

  return (
    <>
      {/* Command Trigger Button */}
      <div className={styles.commandTriggerGroup}>
        <button
          onClick={() => mode === 'api' ? setChatOpen(true) : setOpen(true)}
          className={styles.commandTrigger}
        >
          {mode === 'api' ? <MessageCircle size={14} /> : <CommandIcon size={14} />}
          <span>{mode === 'api' ? 'Chat with Claude' : 'Commands'}</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
        
        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          className={`${styles.modeToggle} ${mode === 'cursor' ? styles.modeCursor : styles.modeApi}`}
          title={mode === 'cursor' ? 'Cursor Agent Mode' : 'Anthropic API Mode'}
        >
          {mode === 'cursor' ? <Bot size={14} /> : <Cloud size={14} />}
          <span>{mode === 'cursor' ? 'Cursor' : 'API'}</span>
        </button>
      </div>

      {/* Chat Panel (API Mode) */}
      <AnimatePresence>
        {chatOpen && mode === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={styles.chatPanel}
          >
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <Cloud size={16} className="text-sky-500" />
                <span>Claude (API)</span>
              </div>
              <div className={styles.chatHeaderActions}>
                {chatMessages.length >= 2 && (
                  <button 
                    onClick={saveMemories} 
                    className={`${styles.chatHeaderBtn} ${styles.saveMemoryBtn}`}
                    title="Save insights to memory"
                    disabled={isSavingMemories}
                  >
                    {isSavingMemories ? <Loader2 size={14} className={styles.spinner} /> : <Brain size={14} />}
                  </button>
                )}
                <button onClick={clearChat} className={styles.chatHeaderBtn} title="Clear chat">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => setChatOpen(false)} className={styles.chatHeaderBtn} title="Minimize">
                  <Minimize2 size={14} />
                </button>
              </div>
            </div>

            {/* Memory Save Toast */}
            <AnimatePresence>
              {memorySaveResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`${styles.memoryToast} ${memorySaveResult.success ? styles.memoryToastSuccess : styles.memoryToastError}`}
                >
                  {memorySaveResult.success ? (
                    <>
                      <Brain size={14} />
                      <span>{memorySaveResult.count} memories saved</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} />
                      <span>Failed to save memories</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Messages */}
            <div className={styles.chatMessages}>
              {chatMessages.length === 0 && (
                <div className={styles.chatEmpty}>
                  <MessageCircle size={32} className="text-muted-foreground mb-2" />
                  <p>Brainstorm with Claude about your project.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Claude has context about your tasks and sprint status.
                  </p>
                  
                  {/* Quick Prompts */}
                  <div className={styles.quickPrompts}>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendChatMessage(prompt.label)}
                        className={styles.quickPromptBtn}
                      >
                        <prompt.icon size={12} />
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.chatMessage} ${msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant}`}
                >
                  <div className={styles.chatMessageContent}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isSending && (
                <div className={`${styles.chatMessage} ${styles.chatMessageAssistant}`}>
                  <div className={styles.chatMessageContent}>
                    <Loader2 size={14} className={styles.spinner} />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className={styles.chatInputContainer}>
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Ask Claude anything about your project..."
                className={styles.chatInput}
                disabled={isSending}
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={!chatInput.trim() || isSending}
                className={styles.chatSendBtn}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copied Toast */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.copiedToast}
          >
            <Check size={14} />
            <span>{copiedPrompt} prompt copied!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Indicator */}
      {isRunning && (
        <div className={styles.loadingIndicator}>
          <Loader2 size={14} className={styles.spinner} />
          <span>Running command...</span>
        </div>
      )}

      {/* Command Dialog (Cursor Mode) */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search commands..." />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleAddTask}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add New Task</span>
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); onRefreshTasks?.(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Refresh Tasks</span>
              <CommandShortcut>R</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="AI Commands (Cursor Agent)">
            <CommandItem onSelect={() => runCommand('/api/admin/ai/audit', 'audit')}>
              <Scan className="mr-2 h-4 w-4" />
              <span>Project Audit</span>
              <span className="ml-auto text-xs text-muted-foreground">Copy prompt</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand('/api/admin/ai/sync-sprint', 'syncSprint', onRefreshTasks)}>
              <Zap className="mr-2 h-4 w-4" />
              <span>Sync Sprint</span>
              <span className="ml-auto text-xs text-muted-foreground">Copy prompt</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand('/api/admin/ai/suggest-next', 'suggestNext')}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Suggest Next Steps</span>
              <span className="ml-auto text-xs text-muted-foreground">Copy prompt</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand('/api/admin/ai/find-blockers', 'findBlockers')}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span>Find Blockers</span>
              <span className="ml-auto text-xs text-muted-foreground">Copy prompt</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand('/api/admin/ai/generate-report', 'generateReport')}>
              <FileSearch className="mr-2 h-4 w-4" />
              <span>Generate Report</span>
              <span className="ml-auto text-xs text-muted-foreground">Copy prompt</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { setOpen(false); window.location.href = '/admin'; }}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); window.location.href = '/admin/sow'; }}>
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>SOW Tracker</span>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); window.location.href = '/admin/tasks'; }}>
              <ListChecks className="mr-2 h-4 w-4" />
              <span>Task Board</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Result Panel */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={styles.resultPanel}
          >
            <div className={styles.resultHeader}>
              {result.success ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={16} className="text-rose-500" />
              )}
              <h3 className={styles.resultTitle}>{result.title}</h3>
              <button
                className={styles.resultClose}
                onClick={() => setShowResult(false)}
              >
                <X size={14} />
              </button>
            </div>
            
            <p className={styles.resultSummary}>{result.summary}</p>
            
            {result.details && result.details.length > 0 && (
              <div className={styles.resultDetails}>
                <h4 className={styles.resultSubtitle}>
                  <ListChecks size={12} />
                  Details
                </h4>
                <ul className={styles.resultList}>
                  {result.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.suggestions && result.suggestions.length > 0 && (
              <div className={styles.resultSuggestions}>
                <h4 className={styles.resultSubtitle}>
                  <ChevronRight size={12} />
                  Suggested Actions
                </h4>
                <ul className={styles.resultList}>
                  {result.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
