'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { ContactTag } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<ContactTag | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTags, setTotalTags] = useState(0);
  const limit = 20;
  const [formData, setFormData] = useState({
    name: '',
    color: PRESET_COLORS[0],
    description: '',
  });

  useEffect(() => {
    fetchTags();
  }, [page]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/contacts/tags?${params.toString()}`);

      // Handle both paginated and non-paginated responses
      if (response.data.data && Array.isArray(response.data.data)) {
        setTags(response.data.data);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.total_pages || 1);
          setTotalTags(response.data.pagination.total || 0);
        }
      } else {
        setTags(response.data || []);
        setTotalTags(response.data?.length || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTag) {
        await api.put(`/admin/contacts/tags/${editingTag.id}`, formData);
        setSuccess('Tag updated successfully');
      } else {
        await api.post('/admin/contacts/tags', formData);
        setSuccess('Tag created successfully');
      }

      setShowModal(false);
      setEditingTag(null);
      setFormData({ name: '', color: PRESET_COLORS[0], description: '' });
      await fetchTags();
    } catch (err: any) {
      setError(err.message || 'Failed to save tag');
    }
  };

  const handleEdit = (tag: ContactTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/contacts/tags/${id}`);
      setSuccess('Tag deleted successfully');
      setDeleteModal(null);
      await fetchTags();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tag');
    }
  };

  const columns: Column<ContactTag>[] = [
    {
      key: 'name',
      header: 'Tag Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.description || '-'}</span>
      ),
    },
    {
      key: 'contact_count',
      header: 'Contacts',
      render: (row) => (
        <Badge variant="default">{row.contact_count}</Badge>
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
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteModal(row.id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Tags</h1>
            <p className="text-gray-600 mt-1">Organize your contacts with tags</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingTag(null);
            setFormData({ name: '', color: PRESET_COLORS[0], description: '' });
            setShowModal(true);
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Tag
        </Button>
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
          title="All Tags"
          description={`View and manage your contact tags (${totalTags} total)`}
        />
        <Table
          columns={columns}
          data={tags}
          loading={loading}
          emptyMessage="No tags found. Create your first tag to organize contacts."
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {tags.length} of {totalTags} tags
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (page <= 3) {
                    pageNumber = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      size="sm"
                      variant={page === pageNumber ? 'primary' : 'outline'}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTag(null);
        }}
        title={editingTag ? 'Edit Tag' : 'Create Tag'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingTag ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tag Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., VIP Customer"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all
                    ${formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add a description for this tag..."
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Tag"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteModal && handleDelete(deleteModal)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this tag? This will remove it from all contacts.</p>
      </Modal>
    </div>
  );
}
