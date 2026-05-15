'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { RefreshCw } from 'lucide-react';
import { PhoneNumber, WABAAccount } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [wabaAccounts, setWabaAccounts] = useState<WABAAccount[]>([]);
  const [selectedWabaId, setSelectedWabaId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchWabaAccounts = async () => {
    try {
      const response = await api.get('/admin/waba');
      const accounts = response.data || [];
      if (isMountedRef.current) {
        setWabaAccounts(accounts);
        if (accounts.length > 0 && !selectedWabaId) {
          setSelectedWabaId(accounts[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load WABA accounts:', err);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/waba/phone-numbers');
      if (isMountedRef.current) {
        setPhoneNumbers(response.data || []);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load phone numbers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedWabaId) {
      if (isMountedRef.current) {
        setError('Please select a WABA account first');
      }
      return;
    }

    try {
      setSyncLoading(true);
      if (isMountedRef.current) {
        setError(null);
      }
      await api.syncPhoneNumbers(selectedWabaId);
      if (isMountedRef.current) {
        setSuccess('Phone numbers synced successfully');
      }
      await fetchPhoneNumbers();
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || err.message || 'Failed to sync phone numbers');
      }
    } finally {
      if (isMountedRef.current) {
        setSyncLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    // Parallel fetching
    Promise.allSettled([
      fetchWabaAccounts(),
      fetchPhoneNumbers()
    ]);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const columns: Column<PhoneNumber>[] = [
    {
      key: 'display_phone_number',
      header: 'Phone Number',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.display_phone_number}</p>
          <p className="text-sm text-gray-500">{row.verified_name}</p>
        </div>
      ),
    },
    {
      key: 'quality_rating',
      header: 'Quality Rating',
      render: (row) => (
        row.quality_rating ? (
          <Badge variant={
            row.quality_rating === 'GREEN' ? 'success' :
              row.quality_rating === 'YELLOW' ? 'warning' :
                'danger'
          }>
            {row.quality_rating}
          </Badge>
        ) : (
          <span className="text-sm text-gray-400">N/A</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} type="phone" />,
    },
    {
      key: 'webhooks_configured',
      header: 'Webhooks',
      render: (row) => (
        <Badge variant={row.webhooks_configured ? 'success' : 'default'}>
          {row.webhooks_configured ? 'Configured' : 'Not Configured'}
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp Business phone numbers</p>
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
            onClick={handleSync}
            isLoading={syncLoading}
            disabled={!selectedWabaId}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Sync Numbers
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
          title="All Phone Numbers"
          description="View and manage your registered WhatsApp Business phone numbers"
        />
        <Table
          columns={columns}
          data={phoneNumbers}
          loading={loading}
          emptyMessage="No phone numbers found. Add a WABA account to register phone numbers."
        />
      </Card>
    </div>
  );
}
