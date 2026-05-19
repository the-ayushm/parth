'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Tabs from '@/components/ui/Tabs';
import { Plus, Upload, Tag, List, Eye, Search, Trash2, Clock, CheckCircle } from 'lucide-react';
import { Contact } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const limit = 20;
  const isMountedRef = useRef(true);
  const importPollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    // Check for import job ID in URL or localStorage
    const jobIdFromUrl = searchParams.get('jobId');
    const jobIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('activeImportJob') : null;
    const activeJobId = jobIdFromUrl || jobIdFromStorage;

    if (activeJobId) {
      setImportJobId(activeJobId);
    }

    fetchContacts();
    return () => {
      isMountedRef.current = false;
      if (importPollInterval.current) {
        clearInterval(importPollInterval.current);
      }
    };
  }, [searchQuery, filterValid, page]);

  // Poll import job status
  useEffect(() => {
    if (importJobId) {
      pollImportStatus();
      importPollInterval.current = setInterval(pollImportStatus, 2000);
    }

    return () => {
      if (importPollInterval.current) {
        clearInterval(importPollInterval.current);
      }
    };
  }, [importJobId]);

  const pollImportStatus = async () => {
    if (!importJobId) return;

    try {
      const status = await api.getImportJobStatus(importJobId);
      if (isMountedRef.current) {
        setImportStatus(status);

        // Check if job is complete (status is 'queued' means completed, or progress is 100%)
        const isComplete = status.status === 'queued' || status.progress_percentage >= 100;
        const isFailed = status.status === 'failed';

        if (isComplete || isFailed) {
          if (importPollInterval.current) {
            clearInterval(importPollInterval.current);
            importPollInterval.current = null;
          }

          if (isComplete) {
            // Save imported count before clearing
            const processedRows = status.processed_rows || 0;
            setImportedCount(processedRows);
            // Immediately show success and refresh
            setShowImportSuccess(true);
            setImportStatus(status); // Keep status to show the success count
            // Refresh contacts list immediately
            await fetchContacts();
            // Clear from storage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('activeImportJob');
            }
            // Hide progress bar immediately
            setImportJobId(null);

            // Clear success message after 8 seconds
            setTimeout(() => {
              if (isMountedRef.current) {
                setShowImportSuccess(false);
                setImportStatus(null);
              }
            }, 8000);
          } else if (isFailed) {
            setError(status.error || 'Import failed');
            setImportJobId(null);
            setImportStatus(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('activeImportJob');
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to poll import status:', err);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterValid !== 'all') params.append('is_valid', filterValid === 'valid' ? 'true' : 'false');
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/contacts?${params.toString()}`);

      // Handle both paginated and non-paginated responses
      if (isMountedRef.current) {
        if (response.data && Array.isArray(response.data.contacts) && response.data.pagination) {
          setContacts(response.data.contacts);
          setTotalPages(response.data.pagination.total_pages || 1);
          setTotalContacts(response.data.pagination.total || 0);
        } else {
          setContacts(response.data?.contacts || []);
          setTotalPages(1);
          setTotalContacts(response.data?.contacts?.length || 0);
        }
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load contacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    setContactToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      setDeleting(true);
      await api.deleteContact(contactToDelete.id);
      if (isMountedRef.current) {
        setDeleteModalOpen(false);
        setContactToDelete(null);
        setShowDeleteSuccess(true);
        setError(null);
      }
      // Refresh contacts after showing success
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchContacts();
        }
      }, 1000);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to delete contact');
      }
    } finally {
      if (isMountedRef.current) {
        setDeleting(false);
      }
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name_column',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name || 'No Name'}</p>
          <p className="text-sm text-gray-500">{row.phone_number}</p>
        </div>
      ),
    },
    {
      key: 'phone_column',
      header: 'number',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name || 'No Name'}</p>
          <p className="text-sm text-gray-500">{row.phone_number}</p>
        </div>
      ),
    },
    {
      key: 'email_column',
      header: 'email_address',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.email || '-'}</span>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags && row.tags.length > 0 ? (
            row.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="default" style={{ backgroundColor: tag.color }}>
                {tag.name}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-gray-400">No tags</span>
          )}
          {row.tags && row.tags.length > 2 && (
            <Badge variant="default">+{row.tags.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'is_valid',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_valid ? 'success' : 'danger'}>
          {row.is_valid ? 'Valid' : 'Invalid'}
        </Badge>
      ),
    },
    {
      key: 'message_count',
      header: 'Messages',
      render: (row) => (
        <div className="text-sm">
          <p className="text-gray-900">{row.message_count} sent</p>
          {row.failed_count > 0 && (
            <p className="text-red-600">{row.failed_count} failed</p>
          )}
        </div>
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
              router.push(`/contacts/${row.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteContact(row.id, row.name || row.phone_number);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  const tabs = [
    {
      id: 'all',
      label: 'All Contacts',
      count: contacts.length,
    },
    {
      id: 'valid',
      label: 'Valid',
    },
    {
      id: 'invalid',
      label: 'Invalid',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage your contact database</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/contacts/tags')}
          >
            <Tag className="h-5 w-5 mr-2" />
            Manage Tags
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/contacts/lists')}
          >
            <List className="h-5 w-5 mr-2" />
            Manage Lists
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/contacts/import')}
          >
            <Upload className="h-5 w-5 mr-2" />
            Import Contacts
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/contacts/new')}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Import Success Message */}
      {showImportSuccess && (
        <Alert
          variant="success"
          message={`Successfully imported ${importedCount} contacts!`}
          onClose={() => {
            setShowImportSuccess(false);
            setImportStatus(null);
            setImportedCount(0);
          }}
        />
      )}

      {/* Import Progress */}
      {importJobId && importStatus && importStatus.status !== 'queued' && importStatus.status !== 'failed' && importStatus.progress_percentage < 100 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-medium text-gray-900">Import in Progress</h3>
                <p className="text-sm text-gray-600">
                  Processing {importStatus.total_rows || 0} rows...
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${importStatus.progress_percentage || 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-right">
              {importStatus.progress_percentage || 0}% complete
            </p>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Filters */}
      <Card>
        <div className="p-4">
          <Tabs
            tabs={tabs}
            activeTab={filterValid}
            onChange={(tabId) => setFilterValid(tabId as typeof filterValid)}
          />
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader
          title="All Contacts"
          description={`View and manage your contacts (${totalContacts} total)`}
        />
        <Table
          columns={columns}
          data={contacts}
          loading={loading}
          emptyMessage="No contacts found. Add your first contact or import from XLSX."
          onRowClick={(row) => router.push(`/contacts/${row.id}`)}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {contacts.length} of {totalContacts} contacts
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setContactToDelete(null);
        }}
        title=""
        size="sm"
        showCloseButton={false}
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setContactToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              isLoading={deleting}
            >
              Delete Contact
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Delete <span className="font-semibold text-red-600">"{contactToDelete?.name || 'this contact'}"</span>?
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                This contact will be permanently deleted from your system.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Success Toast */}
      {showDeleteSuccess && (
        <Toast
          type="success"
          message={`${contactToDelete?.name || 'Contact'} has been successfully deleted.`}
          onClose={() => setShowDeleteSuccess(false)}
        />
      )}
    </div>
  );
}
