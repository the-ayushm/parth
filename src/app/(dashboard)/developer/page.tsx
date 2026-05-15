'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Clipboard, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';

export default function DeveloperPage() {
  const { company, user } = useAuthStore();
  const [apiKey, setApiKey] = useState<string>('');
  const [companyKey, setCompanyKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedCompanyKey, setCopiedCompanyKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCompanyKey, setShowCompanyKey] = useState(false);
  const [keysGenerated, setKeysGenerated] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (user?.company_id || company?.id) {
      fetchCompanyDetails();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [user?.company_id, company?.id]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      if (isMountedRef.current) {
        setError(null);
      }

      const companyId = company?.id || user?.company_id;
      if (!companyId) {
        if (isMountedRef.current) {
          setError('No company associated with your account');
        }
        setLoading(false);
        return;
      }

      // Fetch company details to get api_key
      const response = await api.get(`/admin/companies/${companyId}`);
      const companyData = response.data;

      if (isMountedRef.current) {
        if (companyData.api_key) {
          setApiKey(companyData.api_key);
          setKeysGenerated(true);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.error?.message || 'Failed to fetch API credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateKeys = async () => {
    try {
      setLoading(true);
      if (isMountedRef.current) {
        setError(null);
      }

      const companyId = company?.id || user?.company_id;
      if (!companyId) {
        if (isMountedRef.current) {
          setError('No company associated with your account');
        }
        setLoading(false);
        return;
      }

      // Call endpoint to regenerate keys
      const response = await api.post(`/admin/companies/${companyId}/regenerate-keys`);
      const data = response.data;

      if (isMountedRef.current) {
        setApiKey(data.apiKey);
        setCompanyKey(data.companyKey);
        setKeysGenerated(true);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.error?.message || 'Failed to generate API credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'api' | 'company') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'api') {
        setCopiedApiKey(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedApiKey(false);
          }
        }, 2000);
      } else {
        setCopiedCompanyKey(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedCompanyKey(false);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 8) + '••••••••••••••••••••';
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Settings</h1>
        <p className="text-gray-600 mt-1">
          API credentials for programmatic access to the Surefy platform
        </p>
      </div>

      {error && (
        <Alert
          variant="error"
          message={error}
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}

      <Card className="mb-6">
        <CardHeader
          title="API Credentials"
          description="Use these credentials to authenticate API requests"
        />
        <CardBody>
          {loading && !keysGenerated ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* API Key */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key (x-api-key)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={showApiKey ? apiKey : maskKey(apiKey)}
                      readOnly
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      placeholder={apiKey ? '' : 'No API key generated yet'}
                    />
                    {apiKey && (
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                  {apiKey && (
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey, 'api')}
                      className="px-4"
                    >
                      {copiedApiKey ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clipboard className="h-5 w-5" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Public identifier for your company
                </p>
              </div>

              {/* Company Key */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Key (x-company-key)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={showCompanyKey ? companyKey : maskKey(companyKey)}
                      readOnly
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      placeholder={companyKey ? '' : 'Click "Regenerate Keys" to view'}
                    />
                    {companyKey && (
                      <button
                        onClick={() => setShowCompanyKey(!showCompanyKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCompanyKey ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                  {companyKey && (
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(companyKey, 'company')}
                      className="px-4"
                    >
                      {copiedCompanyKey ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clipboard className="h-5 w-5" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Secure authentication key (never stored in database)
                </p>
              </div>

              {companyKey && (
                <Alert
                  variant="warning"
                  message="Important: Save your Company Key now! It won't be shown again after you leave this page."
                  className="mb-6"
                />
              )}

              {/* Regenerate Keys Button */}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={generateKeys}
                  isLoading={loading}
                >
                  {keysGenerated ? 'Regenerate Keys' : 'Generate Keys'}
                </Button>
              </div>

              {keysGenerated && !companyKey && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Note: Company key is only shown when regenerating keys. If you've lost your company key, click "Regenerate Keys" to create a new one.
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader
          title="API Usage"
          description="How to use your API credentials"
        />
        <CardBody>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Authentication</h3>
              <p className="text-sm text-gray-600 mb-2">
                Include both headers in your API requests:
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                {`curl https://api.surefy.com/v1/api/messages \\
  -H "x-api-key: ${apiKey || 'your-api-key'}" \\
  -H "x-company-key: ${companyKey || 'your-company-key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone_number_id": "...",
    "to": "+1234567890",
    "template_name": "...",
    "language": "en"
  }'`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Security Best Practices</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Never commit API keys to version control</li>
                <li>Store keys securely using environment variables</li>
                <li>Regenerate keys immediately if compromised</li>
                <li>Use separate keys for development and production</li>
                <li>The company key is never stored in our database for added security</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">API Endpoints</h3>
              <p className="text-sm text-gray-600">
                All API consumer endpoints are prefixed with <code className="bg-gray-100 px-2 py-1 rounded text-xs">/v1/api/</code>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-2">
                <li><code className="text-xs">POST /v1/api/messages</code> - Send messages</li>
                <li><code className="text-xs">GET /v1/api/templates</code> - List templates</li>
                <li><code className="text-xs">POST /v1/api/contacts</code> - Create contacts</li>
                <li><code className="text-xs">GET /v1/api/credits</code> - Check credit balance</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
