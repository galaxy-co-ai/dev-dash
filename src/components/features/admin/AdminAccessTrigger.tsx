'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, Loader2 } from 'lucide-react';
import styles from './AdminAccessTrigger.module.css';

/**
 * Hidden admin access trigger
 * Listens for Ctrl+Shift+A keyboard shortcut
 * Opens a password modal for authentication
 */
export function AdminAccessTrigger() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Listen for Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsModalOpen(true);
        setError('');
        setPassword('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle escape to close
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        router.push('/admin');
      } else {
        const data = await response.json();
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  }, [password, router]);

  if (!isModalOpen) return null;

  return (
    <div 
      className={styles.overlay}
      onClick={() => setIsModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-access-title"
    >
      <div 
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeButton}
          onClick={() => setIsModalOpen(false)}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className={styles.iconContainer}>
          <Lock size={24} />
        </div>

        <h2 id="admin-access-title" className={styles.title}>
          Admin Access
        </h2>
        <p className={styles.subtitle}>
          Enter password to continue
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={styles.input}
              autoFocus
              aria-label="Admin password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                Authenticating...
              </>
            ) : (
              'Enter'
            )}
          </button>
        </form>

        <p className={styles.hint}>
          Press Escape to cancel
        </p>
      </div>
    </div>
  );
}
