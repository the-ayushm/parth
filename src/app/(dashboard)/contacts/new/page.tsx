'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Select from '@/components/ui/Select';
import { ArrowLeft, Save } from 'lucide-react';
import { ContactTag } from '@/types';
import api from '@/lib/api';

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [formData, setFormData] = useState({
    phone_number: '',
    name: '',
    email: '',
    tag_ids: [] as string[],
    attributes: {} as Record<string, any>,
    notes: '',
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/admin/contacts/tags');
      setTags(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/admin/contacts', formData);
      router.push(`/contacts/${response.data.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Contact</h1>
            <p className="text-gray-600 mt-1">Create a new contact</p>
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
                label="Phone Number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                placeholder="+1234567890"
                required
                helperText="Include country code (e.g., +1 for US)"
              />

              <Input
                label="Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Doe"
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes about this contact..."
                />
              </div>
            </div>
          </Card>

          {/* Tags */}
          {tags.length > 0 && (
            <Card>
              <CardHeader title="Tags" />
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className={`
                        inline-flex items-center px-3 py-2 rounded-lg cursor-pointer border-2 transition-colors
                        ${formData.tag_ids.includes(tag.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tag_ids.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        className="sr-only"
                      />
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/contacts')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              <Save className="h-5 w-5 mr-2" />
              Create Contact
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
