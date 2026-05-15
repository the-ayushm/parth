'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { Plus, Eye, RefreshCw } from 'lucide-react';
import { Template, WABAAccount } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [wabaAccounts, setWabaAccounts] = useState<WABAAccount[]>([]);
  const [selectedWabaId, setSelectedWabaId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    // Parallel fetching - fetch both at once
    Promise.allSettled([
      fetchWabaAccounts(),
      fetchTemplates()
    ]);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchWabaAccounts = async () => {
    try {
      const response = await api.get('/admin/waba');
      const accounts = response.data || [];
      if (isMountedRef.current) {
        setWabaAccounts(accounts);
        // Auto-select first WABA account if available
        if (accounts.length > 0 && !selectedWabaId) {
          setSelectedWabaId(accounts[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load WABA accounts:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/templates');
      if (isMountedRef.current) {
        setTemplates(response.data || []);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load templates');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const syncWabaId = selectedWabaId || (wabaAccounts.length > 0 ? wabaAccounts[0].id : null);
    
    if (!syncWabaId) {
      if (isMountedRef.current) {
        setError('No WABA account available. Please add a WABA account first.');
      }
      return;
    }

    try {
      setSyncLoading(true);
      if (isMountedRef.current) {
        setError(null);
      }
      await api.post('/admin/templates/sync', { waba_id: syncWabaId });
      if (isMountedRef.current) {
        setSuccess('Templates synced successfully');
      }
      await fetchTemplates();
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || err.message || 'Failed to sync templates');
      }
    } finally {
      if (isMountedRef.current) {
        setSyncLoading(false);
      }
    }
  };

  const columns: Column<Template>[] = [
    {
      key: 'name',
      header: 'Template Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.language}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <Badge variant="default">
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={
          row.status === 'APPROVED' ? 'success' :
            row.status === 'PENDING' ? 'warning' :
              'danger'
        }>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.created_at), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/templates/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp message templates</p>
        </div>
        <div className="flex items-center gap-3">
          {/* WABA Account Selector */}
          <select
            value={selectedWabaId}
            onChange={(e) => setSelectedWabaId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select WABA Account</option>
            {wabaAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name || account.waba_id}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={() => handleSync()}
            isLoading={syncLoading}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Sync Templates
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/templates/new')}
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert variant="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Table */}
      <Card>
        <CardHeader
          title="All Templates"
          description="View and manage your WhatsApp message templates"
        />
        <Table
          columns={columns}
          data={templates}
          loading={loading}
          emptyMessage="No templates found. Create your first template to get started."
          onRowClick={(row) => router.push(`/templates/${row.id}`)}
        />
      </Card>
    </div>
  );
}
