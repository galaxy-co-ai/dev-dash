'use client';

import { useState, useEffect } from 'react';
import { Minus, Grid3X3, Circle } from 'lucide-react';
import styles from './TextureToggle.module.css';

const TEXTURES = ['off', 'ruled', 'grid'] as const;
type Texture = (typeof TEXTURES)[number];

const ICONS = { off: Circle, ruled: Minus, grid: Grid3X3 } as const;
const LABELS = { off: 'No texture', ruled: 'Ruled lines', grid: 'Graph paper' } as const;

export function TextureToggle() {
  const [texture, setTexture] = useState<Texture>('off');

  useEffect(() => {
    const stored = localStorage.getItem('dev-dash-texture') as Texture | null;
    if (stored && TEXTURES.includes(stored)) {
      setTexture(stored);
      if (stored !== 'off') {
        document.documentElement.setAttribute('data-texture', stored);
      }
    }
  }, []);

  const cycle = () => {
    const next = TEXTURES[(TEXTURES.indexOf(texture) + 1) % TEXTURES.length];
    setTexture(next);
    if (next === 'off') {
      document.documentElement.removeAttribute('data-texture');
    } else {
      document.documentElement.setAttribute('data-texture', next);
    }
    localStorage.setItem('dev-dash-texture', next);
  };

  const Icon = ICONS[texture];
  const nextLabel = LABELS[TEXTURES[(TEXTURES.indexOf(texture) + 1) % TEXTURES.length]];

  return (
    <button
      onClick={cycle}
      className={styles.toggle}
      title={`Switch to: ${nextLabel}`}
      aria-label={`Paper texture: ${LABELS[texture]}. Click to switch.`}
    >
      <Icon size={14} />
      <span>{LABELS[texture]}</span>
    </button>
  );
}
