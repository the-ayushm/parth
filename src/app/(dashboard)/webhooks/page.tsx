'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Webhook } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchWebhooks();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/webhooks');
      if (isMountedRef.current) {
        setWebhooks(response.data || []);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load webhooks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/webhooks/${id}`);
      if (isMountedRef.current) {
        setSuccess('Webhook deleted successfully');
        setDeleteModal(null);
      }
      await fetchWebhooks();
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to delete webhook');
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      // First get the webhook to get all its data
      const webhook = webhooks.find(w => w.id === id);
      if (!webhook) return;

      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await api.put(`/admin/webhooks/${id}`, {
        url: webhook.url,
        events: webhook.events,
        status: newStatus,
      });
      if (isMountedRef.current) {
        setSuccess(`Webhook ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      }
      await fetchWebhooks();
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to update webhook status');
      }
    }
  };

  const columns: Column<Webhook>[] = [
    {
      key: 'url',
      header: 'Webhook URL',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 truncate max-w-md">{row.url}</p>
          <p className="text-sm text-gray-500">{row.events.join(', ')}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'default'}>
          {row.status === 'active' ? 'Active' : 'Inactive'}
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
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/webhooks/${row.id}/edit`);
            }}
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(row.id, row.status);
            }}
            title={row.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'active' ? (
              <PowerOff className="h-4 w-4 text-orange-600" />
            ) : (
              <Power className="h-4 w-4 text-green-600" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal(row.id);
            }}
            title="Delete"
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
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-600 mt-1">Configure webhook endpoints for WhatsApp events</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/webhooks/new')}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Webhook
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
          title="All Webhooks"
          description="Manage your webhook configurations"
        />
        <Table
          columns={columns}
          data={webhooks}
          loading={loading}
          emptyMessage="No webhooks found. Create your first webhook to receive event notifications."
        />
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Webhook"
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
        <p>Are you sure you want to delete this webhook? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
