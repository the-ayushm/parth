'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Toast from '@/components/ui/Toast';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/lib/api';

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<{
    apiKey: string;
    companyKey: string;
    companyId: string;
    userEmail?: string;
    userPhone?: string;
    userName: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business_id: '',
    webhook_url: '',
    initial_credit: '',
    user: {
      name: '',
      password: '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const payload: any = {
        name: formData.name,
        email: formData.email,
        user: {
          name: formData.user.name,
          email: formData.email, // Use company email for user
          phone: formData.phone || undefined, // Use company phone for user
          password: formData.user.password,
        },
      };

      if (formData.phone) payload.phone = formData.phone;
      if (formData.business_id) payload.business_id = formData.business_id;
      if (formData.webhook_url) payload.webhook_url = formData.webhook_url;
      if (formData.initial_credit) payload.initial_credit = parseFloat(formData.initial_credit);

      const response = await api.post('/admin/companies', payload);
      const data = response.data;
      console.log(data);

      setApiKeys({
        apiKey: data.apiKey,
        companyKey: data.companyKey,
        companyId: data.company?.id,
        userName: data.user?.name,
        userEmail: data.user?.email,
        userPhone: data.user?.phone,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Company creation error:', err.response?.data);
      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create company';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`${label} copied to clipboard!`);
  };

  if (success && apiKeys) {
    return (
      <>
        {toastMessage && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setToastMessage(null)}
          />
        )}
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.push('/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>

          <Card>
            <div className="p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">Company Created Successfully!</h2>
              <p className="text-gray-600 text-center mt-2 mb-6">
                Save these credentials safely - they won't be shown again.
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Important: Copy and save these credentials now!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiKeys.companyId}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(apiKeys.companyId, 'Company ID')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Share this ID with users when they register
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiKeys.apiKey}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(apiKeys.apiKey, 'API Key')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    For programmatic API access
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiKeys.companyKey}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(apiKeys.companyKey, 'Company Key')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    For programmatic API access
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-blue-900">User Login Credentials</h3>
                <p className="text-sm text-blue-800">
                  Share these credentials securely with the company user:
                </p>
                <div className="space-y-2 text-sm text-blue-900">
                  <div>
                    <span className="font-medium">Name:</span> {apiKeys.userName}
                  </div>
                  {apiKeys.userEmail && (
                    <div>
                      <span className="font-medium">Email:</span> {apiKeys.userEmail}
                    </div>
                  )}
                  {apiKeys.userPhone && (
                    <div>
                      <span className="font-medium">Phone:</span> {apiKeys.userPhone}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Password:</span> (Set during creation - share securely)
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  The user can login at the login page using their email/phone and password.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => router.push('/companies')}
                  className="flex-1"
                >
                  Back to Companies
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSuccess(false);
                    setApiKeys(null);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      business_id: '',
                      webhook_url: '',
                      initial_credit: '',
                      user: {
                        name: '',
                        password: '',
                      },
                    });
                  }}
                  className="flex-1"
                >
                  Create Another Company
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/companies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Company</h1>
          <p className="text-gray-600 mt-1">Add a new company with initial user account</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader title="Company Information" />
          <div className="p-6 space-y-4">
            <Input
              label="Company Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter company name"
              required
              helperText="Required"
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="company@example.com"
              required
              helperText="Required"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1234567890"
              helperText="Optional"
            />

            <Input
              label="Business ID"
              type="text"
              value={formData.business_id}
              onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
              placeholder="Enter business ID"
              helperText="Optional - External business identifier"
            />

            <Input
              label="Webhook URL"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://example.com/webhook"
              helperText="Optional - For receiving webhooks"
            />

            <Input
              label="Initial Credit"
              type="number"
              value={formData.initial_credit}
              onChange={(e) => setFormData({ ...formData, initial_credit: e.target.value })}
              placeholder="0"
              helperText="Optional - Starting credit balance"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Initial User Account"
            description="Create the first user account for this company"
          />
          <div className="p-6 space-y-4">
            <Input
              label="User Name"
              type="text"
              value={formData.user.name}
              onChange={(e) => setFormData({ ...formData, user: { ...formData.user, name: e.target.value } })}
              placeholder="Enter user's full name"
              required
              helperText="Required"
            />

            <Input
              label="Password"
              type="password"
              value={formData.user.password}
              onChange={(e) => setFormData({ ...formData, user: { ...formData.user, password: e.target.value } })}
              placeholder="Enter password"
              required
              helperText="Required - Share this password with the user securely"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The user account will be created with the company's email and/or phone number for login credentials.
                The user will login using the company email/phone and the password set here.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/companies')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
          >
            <Save className="h-5 w-5 mr-2" />
            Create Company
          </Button>
        </div>
      </form>
    </div>
  );
}
