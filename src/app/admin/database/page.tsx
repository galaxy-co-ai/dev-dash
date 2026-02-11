'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  FileText,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  HardDrive,
  Layers,
  Package,
  type LucideIcon,
} from 'lucide-react';
import styles from './page.module.css';

interface TableInfo {
  name: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  recordCount: number;
  category: 'core' | 'config' | 'events' | 'dev';
  emptyMessage?: string;
}

const TABLE_METADATA: Record<string, Omit<TableInfo, 'recordCount'>> = {
  dev_tasks: {
    name: 'dev_tasks',
    displayName: 'Dev Tasks',
    description: 'Development task tracking',
    icon: FileText,
    category: 'dev',
  },
  dev_notes: {
    name: 'dev_notes',
    displayName: 'Dev Notes',
    description: 'Development notes and scratch pad',
    icon: FileText,
    category: 'dev',
  },
  feedback: {
    name: 'feedback',
    displayName: 'Feedback',
    description: 'User feedback submissions',
    icon: MessageSquare,
    category: 'dev',
  },
  changelog_entries: {
    name: 'changelog_entries',
    displayName: 'Changelog',
    description: 'Project changelog and release notes',
    icon: FileText,
    category: 'dev',
  },
  ai_memories: {
    name: 'ai_memories',
    displayName: 'AI Memories',
    description: 'Persistent context from AI conversations',
    icon: Database,
    category: 'dev',
  },
};

const CATEGORY_CONFIG = {
  core: { label: 'Core Business', icon: Package, color: '#3B82F6' },
  config: { label: 'Configuration', icon: Layers, color: '#8B5CF6' },
  events: { label: 'Event Logs', icon: TrendingUp, color: '#10B981' },
  dev: { label: 'Development', icon: Database, color: '#F59E0B' },
};

type CategoryKey = keyof typeof CATEGORY_CONFIG;

function getHealthStatus(count: number): 'healthy' | 'empty' | 'active' {
  if (count === 0) return 'empty';
  if (count > 10) return 'active';
  return 'healthy';
}

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryKey | 'all'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [copiedTable, setCopiedTable] = useState<string | null>(null);

  const fetchTableCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/tables');
      if (!response.ok) throw new Error('Failed to fetch table data');
      const data = await response.json();

      const enrichedTables: TableInfo[] = Object.entries(data.tables).map(
        ([name, count]) => ({
          ...TABLE_METADATA[name],
          name,
          recordCount: count as number,
        })
      ).filter(t => t.displayName);

      setTables(enrichedTables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  // Filter and search tables
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      const matchesSearch = searchQuery === '' || 
        table.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || table.category === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [tables, searchQuery, activeFilter]);

  // Group filtered tables by category
  const groupedTables = useMemo(() => {
    return filteredTables.reduce((acc, table) => {
      const category = table.category || 'core';
      if (!acc[category]) acc[category] = [];
      acc[category].push(table);
      return acc;
    }, {} as Record<string, TableInfo[]>);
  }, [filteredTables]);

  const totalRecords = tables.reduce((sum, t) => sum + t.recordCount, 0);
  const activeTablesCount = tables.filter(t => t.recordCount > 0).length;

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const copyTableName = async (tableName: string) => {
    try {
      await navigator.clipboard.writeText(tableName);
      setCopiedTable(tableName);
      setTimeout(() => setCopiedTable(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('table-search')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div 
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Database size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Database</h1>
            <p className={styles.subtitle}>Manage application data</p>
          </div>
        </div>
        <button 
          onClick={fetchTableCounts} 
          disabled={loading}
          className={styles.refreshButton}
        >
          <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </header>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <motion.div 
          className={styles.statCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.statIcon} style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <Layers size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{tables.length}</span>
            <span className={styles.statLabel}>Tables</span>
          </div>
        </motion.div>
        
        <motion.div 
          className={styles.statCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className={styles.statIcon} style={{ background: '#D1FAE5', color: '#059669' }}>
            <TrendingUp size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{totalRecords.toLocaleString()}</span>
            <span className={styles.statLabel}>Total Records</span>
          </div>
        </motion.div>
        
        <motion.div 
          className={styles.statCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.statIcon} style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Database size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{activeTablesCount}/{tables.length}</span>
            <span className={styles.statLabel}>Active Tables</span>
          </div>
        </motion.div>
        
        <motion.div 
          className={styles.statCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className={styles.statIcon} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <HardDrive size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>PostgreSQL</span>
            <span className={styles.statLabel}>Neon</span>
          </div>
        </motion.div>
      </div>

      {/* Search & Filter Bar */}
      <motion.div 
        className={styles.searchBar}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className={styles.searchInputWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            id="table-search"
            type="text"
            placeholder="Search tables... (press / to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className={styles.clearSearch}
            >
              ×
            </button>
          )}
        </div>
        <div className={styles.filterPills}>
          <button
            onClick={() => setActiveFilter('all')}
            className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterPillActive : ''}`}
          >
            All
          </button>
          {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, typeof CATEGORY_CONFIG.core][]).map(([key, config]) => {
            const count = groupedTables[key]?.length || 0;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`${styles.filterPill} ${activeFilter === key ? styles.filterPillActive : ''}`}
                style={activeFilter === key ? { background: config.color, borderColor: config.color } : {}}
              >
                <config.icon size={12} />
                {config.label}
                <span className={styles.filterCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>
          <RefreshCw size={24} className={styles.spinning} />
          <span>Loading tables...</span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className={styles.emptySearch}>
          <Search size={32} />
          <h3>No tables found</h3>
          <p>Try adjusting your search or filter</p>
          <button onClick={() => { setSearchQuery(''); setActiveFilter('all'); }} className={styles.resetBtn}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className={styles.categorySections}>
          {(['core', 'config', 'events', 'dev'] as const).map((category, categoryIndex) => {
            const categoryTables = groupedTables[category] || [];
            if (categoryTables.length === 0) return null;

            const config = CATEGORY_CONFIG[category];
            const isCollapsed = collapsedCategories.has(category);
            const CategoryIcon = config.icon;

            return (
              <motion.div 
                key={category}
                className={styles.categorySection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + categoryIndex * 0.05 }}
              >
                <button 
                  className={styles.categoryHeader}
                  onClick={() => toggleCategory(category)}
                >
                  <div className={styles.categoryLeft}>
                    <div 
                      className={styles.categoryIcon}
                      style={{ background: `${config.color}15`, color: config.color }}
                    >
                      <CategoryIcon size={16} />
                    </div>
                    <h2 className={styles.categoryTitle}>{config.label}</h2>
                    <span className={styles.categoryCount}>{categoryTables.length}</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`${styles.collapseIcon} ${isCollapsed ? styles.collapsed : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      className={styles.tableGrid}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {categoryTables.map((table, tableIndex) => {
                        const TableIcon = table.icon;
                        const health = getHealthStatus(table.recordCount);

                        return (
                          <motion.div
                            key={table.name}
                            className={styles.tableCard}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: tableIndex * 0.03 }}
                          >
                            <Link href={`/admin/database/${table.name}`} className={styles.tableCardLink}>
                              <div className={styles.tableCardHeader}>
                                <div 
                                  className={styles.tableIconWrapper}
                                  style={{ background: `${config.color}10`, color: config.color }}
                                >
                                  <TableIcon size={18} />
                                </div>
                                <div className={styles.tableInfo}>
                                  <h3 className={styles.tableName}>{table.displayName}</h3>
                                  <p className={styles.tableDescription}>{table.description}</p>
                                </div>
                              </div>

                              <div className={styles.tableCardFooter}>
                                <div className={styles.recordInfo}>
                                  <span className={`${styles.healthDot} ${styles[`health_${health}`]}`} />
                                  <span className={styles.recordCount}>
                                    {table.recordCount === 0 ? (
                                      <span className={styles.emptyCount}>
                                        {table.emptyMessage || 'No records'}
                                      </span>
                                    ) : (
                                      <>{table.recordCount.toLocaleString()} records</>
                                    )}
                                  </span>
                                </div>
                                <ExternalLink size={14} className={styles.viewIcon} />
                              </div>
                            </Link>

                            {/* Quick Actions */}
                            <div className={styles.quickActions}>
                              <button
                                onClick={(e) => { e.preventDefault(); copyTableName(table.name); }}
                                className={styles.quickAction}
                                title="Copy table name"
                              >
                                {copiedTable === table.name ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Warning Banner */}
      <motion.div 
        className={styles.warningBanner}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AlertCircle size={18} />
        <div>
          <strong>Caution:</strong> Editing data here directly affects the live application. 
          Changes are immediate and cannot be undone.
        </div>
      </motion.div>
    </motion.div>
  );
}
