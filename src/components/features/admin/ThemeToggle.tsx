'use client';

import { useState, useEffect } from 'react';
import { Pen, Palette, BookOpen } from 'lucide-react';
import styles from './ThemeToggle.module.css';

const THEMES = ['classic', 'pastel', 'editorial'] as const;
type Theme = (typeof THEMES)[number];

const ICONS = { classic: Pen, pastel: Palette, editorial: BookOpen } as const;
const LABELS = { classic: 'Classic', pastel: 'Pastel', editorial: 'Editorial' } as const;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('classic');

  useEffect(() => {
    const stored = localStorage.getItem('dev-dash-theme') as Theme | null;
    if (stored && THEMES.includes(stored)) {
      setTheme(stored);
      if (stored !== 'classic') {
        document.documentElement.setAttribute('data-theme', stored);
      }
    }
  }, []);

  const cycle = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
    if (next === 'classic') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', next);
    }
    localStorage.setItem('dev-dash-theme', next);
  };

  const Icon = ICONS[theme];
  const nextLabel = LABELS[THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]];

  return (
    <button
      onClick={cycle}
      className={styles.toggle}
      title={`Switch to: ${nextLabel}`}
      aria-label={`Theme: ${LABELS[theme]}. Click to switch.`}
    >
      <Icon size={14} />
      <span>{LABELS[theme]}</span>
    </button>
  );
}
