'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquareText,
  ListTodo,
  FileText,
  LogOut,
  ClipboardList,
  Database,
  History,
  ArrowLeft,
  FolderOpen,
} from 'lucide-react';
import config from '@/admin.config';
import { useProject } from './[slug]/ProjectContext';
import { TextureToggle } from '@/components/features/admin/TextureToggle';
import { ThemeToggle } from '@/components/features/admin/ThemeToggle';
import styles from './admin.module.css';

/**
 * Build nav items scoped to the current project's base path
 */
function getNavItems(basePath: string) {
  return [
    { id: 'dashboard', label: 'Dashboard', href: basePath, icon: LayoutDashboard, exact: true },
    { id: 'database', label: 'Database', href: `${basePath}/database`, icon: Database },
    { id: 'sow', label: 'SOW Tracker', href: `${basePath}/sow`, icon: ClipboardList },
    { id: 'changelog', label: 'Changelog', href: `${basePath}/changelog`, icon: History },
    { id: 'feedback', label: 'Feedback', href: `${basePath}/feedback`, icon: MessageSquareText },
    { id: 'tasks', label: 'Tasks', href: `${basePath}/tasks`, icon: ListTodo },
    { id: 'notes', label: 'Notes', href: `${basePath}/notes`, icon: FileText },
  ];
}

async function handleLogout() {
  await fetch('/api/admin/auth', { method: 'DELETE' });
  window.location.href = '/';
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { project, basePath } = useProject();
  const NAV_ITEMS = getNavItems(basePath);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className={styles.sidebar} aria-label="Admin navigation">
      {/* Logo */}
      <div className={styles.logoArea}>
        <Link href={basePath} className={styles.logoLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.project.logoPath}
            alt={config.project.logoAlt}
            className={styles.logoImage}
            style={{ height: '28px', width: 'auto' }}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.active : ''}`}
                >
                  <item.icon size={16} className={styles.navIcon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <TextureToggle />
        <ThemeToggle />
        <Link href="/admin" className={styles.footerLink}>
          <FolderOpen size={14} />
          <span>All Projects</span>
        </Link>
        <Link href="/" className={styles.footerLink}>
          <ArrowLeft size={14} />
          <span>Back to Site</span>
        </Link>
        <button
          onClick={handleLogout}
          className={styles.footerButton}
        >
          <LogOut size={14} />
          <span>Exit Admin</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
