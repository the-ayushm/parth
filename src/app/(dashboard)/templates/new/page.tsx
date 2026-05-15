'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/lib/api';

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    waba_id: '',
    header_type: 'none',
    header_text: '',
    body_text: '',
    footer_text: '',
    buttons: [] as any[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Build components array
      const components: any[] = [];

      // Header component
      if (formData.header_type !== 'none') {
        components.push({
          type: 'HEADER',
          format: formData.header_type.toUpperCase(),
          text: formData.header_text,
        });
      }

      // Body component
      components.push({
        type: 'BODY',
        text: formData.body_text,
      });

      // Footer component
      if (formData.footer_text) {
        components.push({
          type: 'FOOTER',
          text: formData.footer_text,
        });
      }

      // Buttons component
      if (formData.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: formData.buttons,
        });
      }

      const response = await api.post('/admin/templates', {
        name: formData.name,
        category: formData.category,
        language: formData.language,
        waba_id: formData.waba_id,
        components,
      });

      router.push(`/templates/${response.data.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/templates')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Template</h1>
            <p className="text-gray-600 mt-1">Create a new WhatsApp message template</p>
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
          {/* Basic Information */}
          <Card>
            <CardHeader title="Basic Information" />
            <div className="p-6 space-y-4">
              <Input
                label="Template Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., welcome_message"
                required
                helperText="Use only lowercase letters, numbers, and underscores"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  options={[
                    { value: 'MARKETING', label: 'Marketing' },
                    { value: 'UTILITY', label: 'Utility' },
                    { value: 'AUTHENTICATION', label: 'Authentication' },
                  ]}
                  required
                />

                <Select
                  label="Language"
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'en_US', label: 'English (US)' },
                    { value: 'id', label: 'Indonesian' },
                    { value: 'es', label: 'Spanish' },
                  ]}
                  required
                />
              </div>

              <Input
                label="WABA ID"
                type="text"
                value={formData.waba_id}
                onChange={(e) => handleChange('waba_id', e.target.value)}
                placeholder="Enter your WABA ID"
                required
              />
            </div>
          </Card>

          {/* Template Content */}
          <Card>
            <CardHeader title="Template Content" />
            <div className="p-6 space-y-4">
              <Select
                label="Header Type"
                value={formData.header_type}
                onChange={(e) => handleChange('header_type', e.target.value)}
                options={[
                  { value: 'none', label: 'No Header' },
                  { value: 'text', label: 'Text Header' },
                  { value: 'image', label: 'Image Header' },
                  { value: 'video', label: 'Video Header' },
                  { value: 'document', label: 'Document Header' },
                ]}
              />

              {formData.header_type === 'text' && (
                <Input
                  label="Header Text"
                  type="text"
                  value={formData.header_text}
                  onChange={(e) => handleChange('header_text', e.target.value)}
                  placeholder="Enter header text"
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.body_text}
                  onChange={(e) => handleChange('body_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  placeholder="Enter your message text here. Use {{1}}, {{2}} for variables."
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use curly braces for variables: Hello {'{'}1{'}'}, your order {'{'}2{'}'} is ready!
                </p>
              </div>

              <Input
                label="Footer Text (Optional)"
                type="text"
                value={formData.footer_text}
                onChange={(e) => handleChange('footer_text', e.target.value)}
                placeholder="e.g., Powered by YourCompany"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/templates')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              <Save className="h-5 w-5 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
