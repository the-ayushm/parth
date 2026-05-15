'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, Save, User, MessageSquare, Tag as TagIcon } from 'lucide-react';
import { Contact, ContactTag } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    tag_ids: [] as string[],
  });

  useEffect(() => {
    if (id) {
      fetchContact();
      fetchTags();
    }
  }, [id]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/contacts/${id}`);
      const data = response.data;
      setContact(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        notes: data.notes || '',
        tag_ids: data.tags?.map((t: ContactTag) => t.id) || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

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
      setSaving(true);
      setError(null);

      await api.put(`/admin/contacts/${id}`, {
        name: formData.name,
        email: formData.email,
        notes: formData.notes,
        tag_ids: formData.tag_ids,
      });

      setSuccess('Contact updated successfully');
      await fetchContact();
    } catch (err: any) {
      setError(err.message || 'Failed to update contact');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/contacts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
        <Alert variant="error" message={error} />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">{contact?.name || 'Contact Details'}</h1>
            <p className="text-gray-600 mt-1">{contact?.phone_number}</p>
          </div>
        </div>
        <Badge variant={contact?.is_valid ? 'success' : 'danger'}>
          {contact?.is_valid ? 'Valid' : 'Invalid'}
        </Badge>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert variant="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader title="Contact Information" icon={User} />
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-base text-gray-900 mt-1 font-mono">{contact?.phone_number}</p>
                </div>

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
                    rows={4}
                    placeholder="Add any notes about this contact..."
                  />
                </div>
              </div>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader title="Tags" icon={TagIcon} />
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card>
              <CardHeader title="Statistics" icon={MessageSquare} />
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Messages Sent</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{contact?.message_count || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Failed Messages</label>
                  <p className="text-2xl font-bold text-red-600 mt-1">{contact?.failed_count || 0}</p>
                </div>
                {!contact?.is_valid && contact?.invalid_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Invalid Reason</label>
                    <p className="text-sm text-red-600 mt-1">{contact.invalid_reason}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Metadata */}
            {contact && (
              <Card>
                <CardHeader title="Metadata" />
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(contact.created_at), 'PPp')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(contact.updated_at), 'PPp')}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
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
            isLoading={saving}
          >
            <Save className="h-5 w-5 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
