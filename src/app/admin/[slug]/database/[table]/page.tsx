'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Plus,
  Save,
  X,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/features/admin/DataTable';
import { useProject } from '../../ProjectContext';

interface TableData {
  table: string;
  records: Record<string, unknown>[];
  columns: string[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  editable: boolean;
}

const TABLE_DISPLAY_NAMES: Record<string, string> = {
  dev_tasks: 'Dev Tasks',
  dev_notes: 'Dev Notes',
  feedback: 'Feedback',
  changelog_entries: 'Changelog',
  ai_memories: 'AI Memories',
};

const HIDDEN_COLUMNS = ['rawResponse', 'pricingData', 'metadata'];
const READ_ONLY_COLUMNS = ['id', 'createdAt', 'updatedAt'];

export default function TableViewerPage() {
  const params = useParams();
  const tableName = params.table as string;
  const { basePath } = useProject();
  const [data, setData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/tables/${tableName}?page=1&limit=1000`);
      if (!response.ok) throw new Error('Failed to fetch table data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (record: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/tables/${tableName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error('Failed to save changes');
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/tables/${tableName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error('Failed to delete record');
    await fetchData();
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/tables/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecordData),
      });
      if (!response.ok) throw new Error('Failed to create record');
      await fetchData();
      setShowCreateForm(false);
      setNewRecordData({});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const displayName = TABLE_DISPLAY_NAMES[tableName] || tableName;
  const visibleColumns = data?.columns.filter((col) => !HIDDEN_COLUMNS.includes(col)) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`${basePath}/database`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{displayName}</h1>
              {!data?.editable && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Read-only
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {data?.pagination.totalCount.toLocaleString() || 0} records
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data?.editable && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && data?.editable && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Create New Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {visibleColumns
                .filter((col) => col !== 'id' && col !== 'createdAt' && col !== 'updatedAt')
                .map((column) => (
                  <div key={column} className="space-y-1">
                    <label htmlFor={`new-${column}`} className="text-xs font-medium text-muted-foreground">
                      {column}
                    </label>
                    <Input
                      id={`new-${column}`}
                      type="text"
                      className="h-8 text-sm"
                      value={String(newRecordData[column] ?? '')}
                      onChange={(e) =>
                        setNewRecordData((prev) => ({ ...prev, [column]: e.target.value }))
                      }
                    />
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewRecordData({});
                }}
                disabled={saving}
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3 w-3" />
                )}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : data ? (
        <DataTable
          data={data.records}
          columns={data.columns}
          editable={data.editable}
          hiddenColumns={HIDDEN_COLUMNS}
          readOnlyColumns={READ_ONLY_COLUMNS}
          onSave={handleSave}
          onDelete={handleDelete}
          pageSize={25}
        />
      ) : null}
    </div>
  );
}
