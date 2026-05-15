'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWABA } from '@/hooks/useWABA';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, RefreshCw, Edit } from 'lucide-react';
import { WABAAccount } from '@/types';
import { format } from 'date-fns';

export default function WABADetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { getAccount, syncPhoneNumbers } = useWABA();
  const [account, setAccount] = useState<WABAAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAccount();
  }, [id]);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const data = await getAccount(id);

      setAccount(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load WABA account');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPhoneNumbers = async () => {
    try {
      setSyncLoading(true);
      await syncPhoneNumbers(id);
      setSuccess('Phone numbers synced successfully');
      await loadAccount();
    } catch (err: any) {
      setError(err.message || 'Failed to sync phone numbers');
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">WABA account not found</p>
        <Button
          variant="outline"
          onClick={() => router.push('/waba')}
          className="mt-4"
        >
          Back to WABA Accounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/waba')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
            <p className="text-gray-600 mt-1">WABA ID: {account.wabaId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncPhoneNumbers}
            isLoading={syncLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Phone Numbers
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/waba/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
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

      {/* Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Account Information" />
          <CardBody>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={account.status} type="waba" />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">WABA ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{account.wabaId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone Number ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{account.phoneNumberId}</dd>
              </div>
              {/* <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(account.created_at), 'MMM dd, yyyy HH:mm')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(account.updated_at), 'MMM dd, yyyy HH:mm')}
                </dd>
              </div> */}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Configuration" />
          <CardBody>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Access Token</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {account.accessToken ? '••••••••••••••••' : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Webhook Verify Token</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {account.webhookVerifyToken ? '••••••••••••••••' : 'Not set'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
