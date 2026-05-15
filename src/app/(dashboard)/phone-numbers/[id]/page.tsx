'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, Phone, Settings } from 'lucide-react';
import { PhoneNumber } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function PhoneNumberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPhoneNumber();
    }
  }, [id]);

  const fetchPhoneNumber = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/waba/phone-numbers/${id}`);
      setPhoneNumber(response.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load phone number details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !phoneNumber) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/phone-numbers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Phone Numbers
        </Button>
        <Alert variant="error" message={error || 'Phone number not found'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/phone-numbers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{phoneNumber.display_phone_number}</h1>
            <p className="text-gray-600 mt-1">{phoneNumber.verified_name}</p>
          </div>
        </div>
        <StatusBadge status={phoneNumber.status} type="phone" />
      </div>

      {/* Phone Number Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader title="Basic Information" icon={Phone} />
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <p className="text-base text-gray-900 mt-1">{phoneNumber.display_phone_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Verified Name</label>
              <p className="text-base text-gray-900 mt-1">{phoneNumber.verified_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number ID</label>
              <p className="text-base text-gray-900 mt-1 font-mono text-sm">{phoneNumber.phone_number_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">WABA ID</label>
              <p className="text-base text-gray-900 mt-1 font-mono text-sm">{phoneNumber.waba_id}</p>
            </div>
          </div>
        </Card>

        {/* Status & Configuration */}
        <Card>
          <CardHeader title="Status & Configuration" icon={Settings} />
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <StatusBadge status={phoneNumber.status} type="phone" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Quality Rating</label>
              <div className="mt-1">
                {phoneNumber.quality_rating ? (
                  <Badge variant={
                    phoneNumber.quality_rating === 'GREEN' ? 'success' :
                    phoneNumber.quality_rating === 'YELLOW' ? 'warning' :
                    'danger'
                  }>
                    {phoneNumber.quality_rating}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400">N/A</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Webhooks</label>
              <div className="mt-1">
                <Badge variant={phoneNumber.webhooks_configured ? 'success' : 'default'}>
                  {phoneNumber.webhooks_configured ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="text-base text-gray-900 mt-1">
                {format(new Date(phoneNumber.created_at), 'PPpp')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-base text-gray-900 mt-1">
                {format(new Date(phoneNumber.updated_at), 'PPpp')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quality Rating Information */}
      {phoneNumber.quality_rating && (
        <Card>
          <CardHeader title="Quality Rating Information" />
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What is Quality Rating?</h4>
              <p className="text-sm text-blue-700">
                Quality rating is determined by how messages are received by recipients over a recent 7-day period.
                The rating can be GREEN (high quality), YELLOW (medium quality), or RED (low quality).
              </p>
              {phoneNumber.quality_rating !== 'GREEN' && (
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Note:</strong> A lower quality rating may result in reduced message throughput limits.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
