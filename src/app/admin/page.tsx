'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import styles from './page.module.css';

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/projects');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProjects(data.projects);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <FolderOpen size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Projects</h1>
            <p className={styles.subtitle}>Select a project to manage</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={styles.createButton}
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)} className={styles.errorDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleCreate}
            className={styles.createForm}
          >
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label htmlFor="project-name" className={styles.label}>
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My New Project"
                  className={styles.input}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="project-desc" className={styles.label}>
                  Description <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="project-desc"
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief project description"
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className={styles.submitButton}
              >
                {creating ? <Loader2 size={14} className={styles.spinner} /> : <Plus size={14} />}
                <span>{creating ? 'Creating...' : 'Create Project'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Loading projects...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className={styles.emptyState}>
          <FolderOpen size={40} strokeWidth={1.5} />
          <h2>No projects yet</h2>
          <p>Create your first project to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className={styles.submitButton}
          >
            <Plus size={14} />
            <span>Create Project</span>
          </button>
        </div>
      )}

      {/* Project Cards */}
      {!loading && projects.length > 0 && (
        <div className={styles.grid}>
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Link href={`/admin/${project.slug}`} className={styles.card}>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{project.name}</h3>
                  {project.description && (
                    <p className={styles.cardDescription}>{project.description}</p>
                  )}
                  <p className={styles.cardMeta}>
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight size={16} className={styles.cardArrow} />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
