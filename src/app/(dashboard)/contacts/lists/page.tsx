'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, Upload, Trash2, Clock } from 'lucide-react';
import { ContactList } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLists, setTotalLists] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLists();
  }, [page]);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/contacts/lists?${params.toString()}`);

      // Handle both paginated and non-paginated responses
      if (response.data.data && Array.isArray(response.data.data)) {
        setLists(response.data.data);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.total_pages || 1);
          setTotalLists(response.data.pagination.total || 0);
        }
      } else {
        setLists(response.data || []);
        setTotalLists(response.data?.length || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the list "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteContactList(id);
      await fetchLists();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete list');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<ContactList>[] = [
    {
      key: 'name',
      header: 'List Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.file_name && (
            <p className="text-sm text-gray-500">Source: {row.file_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'total_contacts',
      header: 'Total Contacts',
      render: (row) => (
        <Badge variant="default">{row.total_contacts}</Badge>
      ),
    },
    {
      key: 'valid_contacts',
      header: 'Valid',
      render: (row) => (
        <Badge variant="success">{row.valid_contacts}</Badge>
      ),
    },
    {
      key: 'invalid_contacts',
      header: 'Invalid',
      render: (row) => (
        row.invalid_contacts > 0 ? (
          <Badge variant="danger">{row.invalid_contacts}</Badge>
        ) : (
          <span className="text-sm text-gray-400">0</span>
        )
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
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteList(row.id, row.name);
            }}
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
            <h1 className="text-2xl font-bold text-gray-900">Contact Lists</h1>
            <p className="text-gray-600 mt-1">View your imported contact lists</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/contacts/import')}
        >
          <Upload className="h-5 w-5 mr-2" />
          Import New List
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Info Card */}
      <Card>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">About Contact Lists</h4>
            <p className="text-sm text-blue-700">
              Lists are created when you import contacts from Excel files. Each import creates a new list
              that you can use to filter and organize your contacts. You can assign contacts from lists to
              tags for better organization.
            </p>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader
          title="All Lists"
          description={`View your imported contact lists (${totalLists} total)`}
        />
        <Table
          columns={columns}
          data={lists}
          loading={loading}
          emptyMessage="No contact lists found. Import your first list to get started."
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {lists.length} of {totalLists} lists
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
    </div>
  );
}
