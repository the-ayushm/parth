'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWABA } from '@/hooks/useWABA';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { WABAAccount } from '@/types';
import { format } from 'date-fns';

export default function WABAPage() {
  const router = useRouter();
  const { accounts, loading, deleteAccount, sync } = useWABA();
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
      if (isMountedRef.current) {
        setSuccess('WABA account deleted successfully');
        setDeleteModal(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to delete WABA account');
      }
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncLoading(id);
      await sync(id);
      if (isMountedRef.current) {
        setSuccess('WABA account synced successfully');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to sync WABA account');
      }
    } finally {
      if (isMountedRef.current) {
        setSyncLoading(null);
      }
    }
  };

  const columns: Column<WABAAccount>[] = [
    {
      key: 'name',
      header: 'Account Name',
      width: '25%',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">ID: {row.waba_id}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '25%',
      render: (row) => <StatusBadge status={row.status} type="waba" />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      width: '25%',
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
      width: '25%',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/waba/${row.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleSync(row.id);
            }}
            isLoading={syncLoading === row.id}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal(row.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">WABA Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp Business API accounts</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/waba/new')}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add WABA Account
        </Button>
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
          title="All WABA Accounts"
          description="View and manage your WhatsApp Business API accounts"
        />
        <Table
          columns={columns}
          data={accounts}
          loading={loading}
          emptyMessage="No WABA accounts found. Create your first account to get started."
          onRowClick={(row) => router.push(`/waba/${row.id}`)}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete WABA Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteModal && handleDelete(deleteModal)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this WABA account? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
