'use client';

import { useEffect, useState } from 'react';

import { useRouter, useParams } from 'next/navigation';

import { ArrowLeft, Save, User, MessageSquare, Tag as TagIcon, ChevronDown, Search } from 'lucide-react';

import { format } from 'date-fns';

import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { Contact, ContactTag } from '@/types';


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
    assigned_to: '' as string
  });

  const [users, setUsers] = useState<any[]>([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (id) {
      fetchContact();
      fetchTags();
    }
  }, [id]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/companies/user');

      setUsers(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };


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
        assigned_to: data.assigned_to || ''
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
        assigned_to: formData.assigned_to || '',
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

  useEffect(() => {
    if (id) {
      fetchContact();
      fetchTags();
      fetchUsers();
    }
  }, [id]);

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
              <CardHeader title="Edit Contact Information" icon={User} />
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

            {/* Assigned User */}
            <Card>
              <CardHeader title="Assigned User" icon={User} />
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>

                <div className="relative inline-block text-left w-full">
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="w-full inline-flex justify-between items-center text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="truncate">
                      {!formData.assigned_to
                        ? 'Unassigned'
                        : users.find(u => String(u.id) === String(formData.assigned_to.trim()))?.name || 'Unassigned'}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0 text-gray-400" />
                  </button>

                  {/* Click-away backdrop overlay */}
                  {isUserDropdownOpen && (
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                  )}

                  {/* Popover Menu content */}
                  {isUserDropdownOpen && (
                    <div className="absolute left-0 mt-1 w-full rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 focus:outline-none max-h-[350px] flex flex-col">
                      {/* User Search Input */}
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Scrollable checklist of options */}
                      <div className="overflow-y-auto py-1 flex-1 max-h-[220px]">
                        {/* Unassign special option */}
                        <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="assign-user"
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 mr-2"
                            checked={!formData.assigned_to}
                            onChange={() => {
                              handleChange('assigned_to', '');
                              setIsUserDropdownOpen(false);
                            }}
                          />
                          <span className="font-semibold text-red-600">Unassigned (Remove Assignment)</span>
                        </label>

                        <div className="border-t border-gray-100 my-1" />

                        {/* Created Users list filtered by search query */}
                        {users
                          .filter(user =>
                            user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                          .map(user => {
                            const isChecked = formData.assigned_to === String(user.id);

                            return (
                              <label
                                key={user.id}
                                className="flex items-center px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer select-none"
                              >
                                <input
                                  type="radio"
                                  name="assign-user"
                                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 mr-2"
                                  checked={isChecked}
                                  onChange={() => {
                                    handleChange('assigned_to', String(user.id));
                                    setIsUserDropdownOpen(false);
                                  }}
                                />
                                <div className="truncate">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 leading-none">{user.name}</p>
                                    {user.role && user.role.toLowerCase() !== 'user' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded uppercase tracking-wider font-sans">
                                        {user.role}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{user.email || user.phone || 'no contact info'}</p>
                                </div>
                              </label>
                            );
                          })}

                        {users.length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500 text-center">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
