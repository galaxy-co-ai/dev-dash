'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  RefreshCw,
  AlertCircle,
  Pin,
  PinOff,
  X,
  Edit2,
  Loader2,
  FileText,
  StickyNote,
} from 'lucide-react';
import styles from './page.module.css';

interface Note {
  id: string;
  title: string;
  content: string;
  category: 'architecture' | 'decision' | 'idea' | 'reference' | 'todo' | 'meeting' | 'general';
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General', color: '#666' },
  { value: 'architecture', label: 'Architecture', color: '#3B82F6' },
  { value: 'decision', label: 'Decision', color: '#22C55E' },
  { value: 'idea', label: 'Idea', color: '#F59E0B' },
  { value: 'reference', label: 'Reference', color: '#A855F7' },
  { value: 'todo', label: 'Todo', color: '#EF4444' },
  { value: 'meeting', label: 'Meeting', color: '#06B6D4' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({ 
    title: '', 
    content: '', 
    category: 'general' as Note['category'],
    isPinned: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      
      const response = await fetch(`/api/admin/notes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setNotes(data.notes || []);
    } catch {
      setError('Could not load notes');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      });
      
      if (response.ok) {
        const { note } = await response.json();
        setNotes((prev) => [note, ...prev]);
        setNewNote({ title: '', content: '', category: 'general', isPinned: false });
        setShowAddForm(false);
      }
    } catch {
      // Silent fail
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingNote.title,
          content: editingNote.content,
          category: editingNote.category,
          isPinned: editingNote.isPinned,
        }),
      });
      
      if (response.ok) {
        const { note } = await response.json();
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
        setEditingNote(null);
      }
    } catch {
      // Silent fail
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await fetch(`/api/admin/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });
      
      if (response.ok) {
        const { note: updated } = await response.json();
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      }
    } catch {
      // Silent fail
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/admin/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch {
      // Silent fail
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <StickyNote size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Notes</h1>
            <p className={styles.subtitle}>{notes.length} notes</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowAddForm(true)}
            className={styles.addButton}
          >
            <Plus size={16} />
            Add Note
          </button>
          <button onClick={fetchNotes} className={styles.refreshButton} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Filter */}
      <div className={styles.filters}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={styles.filterSelect}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Note Modal */}
      {(showAddForm || editingNote) && (
        <div className={styles.modalOverlay} onClick={() => { setShowAddForm(false); setEditingNote(null); }}>
          <form 
            className={styles.noteForm} 
            onClick={(e) => e.stopPropagation()}
            onSubmit={editingNote ? handleUpdateNote : handleAddNote}
          >
            <div className={styles.formHeader}>
              <h2>{editingNote ? 'Edit Note' : 'Add New Note'}</h2>
              <button 
                type="button" 
                onClick={() => { setShowAddForm(false); setEditingNote(null); }} 
                className={styles.closeButton}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="note-title">Title</label>
              <input
                id="note-title"
                type="text"
                value={editingNote?.title ?? newNote.title}
                onChange={(e) => {
                  if (editingNote) {
                    setEditingNote({ ...editingNote, title: e.target.value });
                  } else {
                    setNewNote({ ...newNote, title: e.target.value });
                  }
                }}
                placeholder="Note title"
                autoFocus
              />
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="note-content">Content</label>
              <textarea
                id="note-content"
                value={editingNote?.content ?? newNote.content}
                onChange={(e) => {
                  if (editingNote) {
                    setEditingNote({ ...editingNote, content: e.target.value });
                  } else {
                    setNewNote({ ...newNote, content: e.target.value });
                  }
                }}
                placeholder="Write your note..."
                rows={8}
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label htmlFor="note-category">Category</label>
                <select
                  id="note-category"
                  value={editingNote?.category ?? newNote.category}
                  onChange={(e) => {
                    if (editingNote) {
                      setEditingNote({ ...editingNote, category: e.target.value as Note['category'] });
                    } else {
                      setNewNote({ ...newNote, category: e.target.value as Note['category'] });
                    }
                  }}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formField}>
                <label>Options</label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editingNote?.isPinned ?? newNote.isPinned}
                    onChange={(e) => {
                      if (editingNote) {
                        setEditingNote({ ...editingNote, isPinned: e.target.checked });
                      } else {
                        setNewNote({ ...newNote, isPinned: e.target.checked });
                      }
                    }}
                  />
                  Pin this note
                </label>
              </div>
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="button" 
                onClick={() => { setShowAddForm(false); setEditingNote(null); }} 
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.submitButton} 
                disabled={isSubmitting || !(editingNote?.title ?? newNote.title).trim() || !(editingNote?.content ?? newNote.content).trim()}
              >
                {isSubmitting ? <Loader2 size={16} className={styles.spinner} /> : null}
                {editingNote ? 'Save Changes' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading/Error States */}
      {isLoading && (
        <div className={styles.loading}>
          <RefreshCw size={20} className={styles.spinner} />
          Loading notes...
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && notes.length === 0 && (
        <div className={styles.empty}>
          <FileText size={32} />
          <p>No notes yet</p>
          <span>Click &quot;Add Note&quot; to get started</span>
        </div>
      )}

      {/* Notes Grid */}
      {!isLoading && notes.length > 0 && (
        <>
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Pin size={14} />
                Pinned
              </h2>
              <div className={styles.notesGrid}>
                {pinnedNotes.map((note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onTogglePin={handleTogglePin}
                    onEdit={setEditingNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Other Notes */}
          {unpinnedNotes.length > 0 && (
            <section className={styles.section}>
              {pinnedNotes.length > 0 && (
                <h2 className={styles.sectionTitle}>Other Notes</h2>
              )}
              <div className={styles.notesGrid}>
                {unpinnedNotes.map((note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onTogglePin={handleTogglePin}
                    onEdit={setEditingNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NoteCard({ 
  note, 
  onTogglePin, 
  onEdit, 
  onDelete 
}: { 
  note: Note; 
  onTogglePin: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const category = CATEGORY_OPTIONS.find((c) => c.value === note.category);
  
  return (
    <div className={styles.noteCard}>
      <div className={styles.noteHeader}>
        <span 
          className={styles.categoryBadge}
          style={{ 
            background: `${category?.color}20`, 
            color: category?.color 
          }}
        >
          {category?.label}
        </span>
        <div className={styles.noteActions}>
          <button
            className={`${styles.actionButton} ${note.isPinned ? styles.pinned : ''}`}
            onClick={() => onTogglePin(note)}
            aria-label={note.isPinned ? 'Unpin' : 'Pin'}
          >
            {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            className={styles.actionButton}
            onClick={() => onEdit(note)}
            aria-label="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            className={`${styles.actionButton} ${styles.deleteAction}`}
            onClick={() => onDelete(note.id)}
            aria-label="Delete"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <h3 className={styles.noteTitle}>{note.title}</h3>
      <p className={styles.noteContent}>{note.content}</p>
      
      <div className={styles.noteFooter}>
        <span>{formatDate(note.createdAt)}</span>
      </div>
    </div>
  );
}
