'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/lib/api';

const AVAILABLE_EVENTS = [
  { value: 'message.sent', label: 'message.sent', description: 'Message sent notifications' },
  { value: 'message.delivered', label: 'message.delivered', description: 'Message delivery confirmations' },
  { value: 'message.read', label: 'message.read', description: 'Message read receipts' },
  { value: 'message.failed', label: 'message.failed', description: 'Message delivery failures' },
  { value: 'messages.received', label: 'messages.received', description: 'New incoming messages' },
];

export default function EditWebhookPage() {
  const router = useRouter();
  const params = useParams();
  const webhookId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    url: '',
    secret: '',
    events: [] as string[],
  });

  useEffect(() => {
    fetchWebhook();
  }, [webhookId]);

  const fetchWebhook = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/webhooks`);
      const webhooks = response.data || [];
      const webhook = webhooks.find((w: any) => w.id === webhookId);

      if (webhook) {
        setFormData({
          url: webhook.url || '',
          secret: webhook.secret || '',
          events: webhook.events || [],
        });
      } else {
        setError('Webhook not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.events.length === 0) {
      setError('Please select at least one event');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.put(`/admin/webhooks/${webhookId}`, formData);
      router.push('/webhooks');
    } catch (err: any) {
      setError(err.message || 'Failed to update webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const generateSecret = () => {
    const token = Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
    handleChange('secret', token);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/webhooks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Webhook</h1>
            <p className="text-gray-600 mt-1">Update webhook configuration</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          {/* Webhook Configuration */}
          <Card>
            <CardHeader title="Webhook Configuration" />
            <div className="p-6 space-y-4">
              <Input
                label="Webhook URL"
                type="url"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://your-domain.com/webhook"
                required
                helperText="The URL where webhook events will be sent"
              />

              <div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Secret Token"
                      type="text"
                      value={formData.secret}
                      onChange={(e) => handleChange('secret', e.target.value)}
                      placeholder="Enter or generate a secret token"
                      helperText="Token used to verify webhook requests"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateSecret}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Event Selection */}
          <Card>
            <CardHeader title="Event Subscriptions" />
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select which events you want to receive notifications for
              </p>
              <div className="space-y-3">
                {AVAILABLE_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={() => handleEventToggle(event.value)}
                      className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{event.label}</p>
                      <p className="text-sm text-gray-500">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          {/* Information */}
          <Card>
            <CardHeader title="Webhook Information" />
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How Webhooks Work</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Your webhook endpoint will receive POST requests with event data</li>
                  <li>• Each request will include a signature header for verification</li>
                  <li>• Your endpoint must respond with HTTP 200 within 20 seconds</li>
                  <li>• Failed deliveries will be retried with exponential backoff</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/webhooks')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
            >
              <Save className="h-5 w-5 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
