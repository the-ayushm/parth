'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Download } from 'lucide-react';
import { Campaign } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

interface CampaignMessage {
  leadName: string;
  phoneNumber: string;
  messageStatus: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  fromPhone: string;
  toPhone: string;
  templateName: string;
  templateVariables?: Record<string, string>;
  messageCost: string;
  campaignError?: string | null;
  messageError?: string | null;
  messageErrorCode?: string | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  sentAt?: string | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function CampaignStatsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState<string>('read');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);

  const formatDate = (value?: string | null, fmt: string = 'MMM dd, HH:mm') => {
    if (!value) return '';
    try {
      return format(new Date(value), fmt);
    } catch {
      return value;
    }
  };

  const handleExportCsv = async () => {
    if (!id || exporting) return;
    setExporting(true);

    let allMessages: CampaignMessage[] = [];
    try {
      const statusParam = statusFilter !== 'all' ? `status=${statusFilter}&` : '';
      const pageSizeForExport = 500;
      let pageCursor = 1;
      let totalFromApi = 0;

      while (true) {
        const response = await api.get(
          `/admin/campaigns/${id}/messages?${statusParam}page=${pageCursor}&pageSize=${pageSizeForExport}`
        );

        const payload = response?.data?.data || response?.data || response || {};

        let pageMessages: CampaignMessage[] = [];
        if (payload.total !== undefined && payload.total > 0) {
          totalFromApi = totalFromApi || payload.total;
        } else if (payload.pagination?.total !== undefined && payload.pagination.total > 0) {
          totalFromApi = totalFromApi || payload.pagination.total;
        } else if (payload.meta?.total !== undefined && payload.meta.total > 0) {
          totalFromApi = totalFromApi || payload.meta.total;
        } else if (payload.totalRecords !== undefined && payload.totalRecords > 0) {
          totalFromApi = totalFromApi || payload.totalRecords;
        } else if (payload.count !== undefined && payload.count > 0) {
          totalFromApi = totalFromApi || payload.count;
        }

        if (Array.isArray(payload)) {
          pageMessages = payload;
        } else if (Array.isArray(payload.messages)) {
          pageMessages = payload.messages;
        } else if (Array.isArray(payload.data)) {
          pageMessages = payload.data;
        } else if (Array.isArray(payload.results)) {
          pageMessages = payload.results;
        }

        allMessages = allMessages.concat(pageMessages || []);

        const reachedTotal = totalFromApi > 0 && allMessages.length >= totalFromApi;
        const lastPage = !pageMessages || pageMessages.length < pageSizeForExport;

        if (reachedTotal || lastPage) {
          break;
        }

        pageCursor += 1;

        if (pageCursor > 2000) {
          break;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export campaign messages');
    } finally {
      setExporting(false);
    }

    if (!allMessages.length) return;

    const headers = [
      'Date',
      'Name',
      'Mobile',
      'From Phone',
      'Template',
      'Status',
      'Delivered',
      'Read',
      'Failed',
      'Cost',
      'Error Code',
      'Error',
    ];

    const escapeCell = (value: unknown) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = allMessages.map((m) => [
      formatDate(m.sentAt, 'yyyy-MM-dd HH:mm'),
      m.leadName || '',
      m.phoneNumber || '',
      m.fromPhone || '',
      m.templateName || '',
      m.messageStatus || '',
      formatDate(m.deliveredAt, 'yyyy-MM-dd HH:mm'),
      formatDate(m.readAt, 'yyyy-MM-dd HH:mm'),
      formatDate(m.failedAt, 'yyyy-MM-dd HH:mm'),
      m.messageCost || '',
      m.messageErrorCode || '',
      m.messageError || m.campaignError || '',
    ]);

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campaign_messages_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Get status from URL if present
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchMessages();
    }
  }, [id, page, pageSize, statusFilter]);

  const fetchCampaignData = async () => {
    try {
      const campaignRes = await api.get(`/admin/campaigns/${id}`);
      setCampaign(campaignRes.data || campaignRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign data');
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const statusParam = statusFilter !== 'all' ? `status=${statusFilter}&` : '';
      const response = await api.get(
        `/admin/campaigns/${id}/messages?${statusParam}page=${page}&pageSize=${pageSize}`
      );

      // Debug: log the response structure
      console.log('API Response:', response);

      // Normalize API shapes: response, response.data, response.data.data
      const payload = response?.data?.data || response?.data || response || {};

      console.log('Payload:', payload);
      console.log('Messages count:', Array.isArray(payload) ? payload.length : Array.isArray(payload.data) ? payload.data.length : Array.isArray(payload.messages) ? payload.messages.length : 0);

      let messagesData: CampaignMessage[] = [];
      let apiTotal = 0;
      let apiTotalPages = 1;

      // Extract total from API response - check multiple possible locations
      if (payload.total !== undefined && payload.total > 0) {
        apiTotal = payload.total;
      } else if (payload.pagination?.total !== undefined && payload.pagination.total > 0) {
        apiTotal = payload.pagination.total;
      } else if (payload.meta?.total !== undefined && payload.meta.total > 0) {
        apiTotal = payload.meta.total;
      } else if (payload.totalRecords !== undefined && payload.totalRecords > 0) {
        apiTotal = payload.totalRecords;
      } else if (payload.count !== undefined && payload.count > 0) {
        apiTotal = payload.count;
      }

      // Extract messages array
      if (Array.isArray(payload)) {
        messagesData = payload;
        if (apiTotal === 0) apiTotal = payload.length;
      } else if (Array.isArray(payload.messages)) {
        messagesData = payload.messages;
      } else if (Array.isArray(payload.data)) {
        messagesData = payload.data;
      } else if (Array.isArray(payload.results)) {
        messagesData = payload.results;
      }

      // If we still don't have a total and this is page 1, it might be all the data
      if (apiTotal === 0 && messagesData.length > 0) {
        // If we got a full page of results, assume there's more data
        if (messagesData.length >= pageSize) {
          // Assume there's at least 2 pages worth of data
          apiTotal = messagesData.length * 2;
        } else {
          // Less than a page, so this is all the data
          apiTotal = messagesData.length;
        }
      }

      // If we still have 0 total, use messages length
      if (apiTotal === 0) {
        apiTotal = messagesData.length;
      }

      // Determine if there's a next page
      const currentPageHasFullResults = messagesData.length >= pageSize;
      setHasNextPage(currentPageHasFullResults);

      // If we got a total from API on first page load, store it
      if (apiTotal > 0 && totalEntries === 0) {
        setTotalEntries(apiTotal);
      }

      // Use the stored total or API total
      const finalTotal = totalEntries > 0 ? totalEntries : (apiTotal > 0 ? apiTotal : messagesData.length);

      // Calculate totalPages - if we don't know total, estimate based on current page and data availability
      let calculatedTotalPages = 1;
      if (finalTotal > 0) {
        calculatedTotalPages = Math.ceil(finalTotal / pageSize);
      } else if (currentPageHasFullResults) {
        // If we got a full page of results, we can navigate to at least the next page
        // Always show at least current page + some buffer for navigation
        calculatedTotalPages = Math.max(page + 5, 10);
      } else if (page > 1) {
        // We're on a page > 1 and got partial results, so this is the last page
        calculatedTotalPages = page;
      }

      const paginationData: PaginationInfo = {
        page,
        pageSize,
        total: finalTotal,
        totalPages: calculatedTotalPages,
      };

      console.log('Pagination Data:', paginationData, 'Has Next:', currentPageHasFullResults);

      setMessages(messagesData || []);
      setPagination(paginationData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | undefined | null) => {
    const safeStatus = (status || '').toLowerCase();
    switch (safeStatus) {
      case 'read':
        return <Badge variant="success">Read</Badge>;
      case 'delivered':
        return <Badge variant="info">Delivered</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="default">{status || 'Unknown'}</Badge>;
    }
  };

  const columns: Column<CampaignMessage>[] = [
    {
      key: 'sentAt',
      header: 'Date',
      sortable: true,
      width: '90px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">
          {row.sentAt ? format(new Date(row.sentAt), 'MMM dd, HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'leadName',
      header: 'Name',
      width: '110px',
      render: (row) => (
        <span className="font-medium text-gray-900 truncate block">{row.leadName || '-'}</span>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Mobile',
      width: '95px',
      render: (row) => (
        <span className="text-sm text-blue-600 truncate block">{row.phoneNumber}</span>
      ),
    },
    {
      key: 'fromPhone',
      header: 'From',
      width: '120px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate block">{row.fromPhone || '-'}</span>
      ),
    },
    {
      key: 'templateName',
      header: 'Template',
      width: '140px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">{row.templateName || '-'}</span>
      ),
    },
    {
      key: 'messageStatus',
      header: 'Status',
      width: '80px',
      render: (row) => getStatusBadge(row.messageStatus),
    },
    {
      key: 'deliveredAt',
      header: 'Delivered',
      width: '100px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">
          {row.deliveredAt ? format(new Date(row.deliveredAt), 'MM/dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'readAt',
      header: 'Read',
      width: '100px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">
          {row.readAt ? format(new Date(row.readAt), 'MM/dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'failedAt',
      header: 'Failed',
      width: '100px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">
          {row.failedAt ? format(new Date(row.failedAt), 'MM/dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'messageCost',
      header: 'Cost',
      width: '70px',
      render: (row) => (
        <span className="text-sm text-gray-600">₹{row.messageCost || '0.00'}</span>
      ),
    },
    {
      key: 'messageErrorCode',
      header: 'Error Code',
      width: '100px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">
          {row.messageErrorCode || '-'}
        </span>
      ),
    },
    {
      key: 'campaignError',
      header: 'Error',
      width: '160px',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate">
          {row.campaignError || row.messageError || '-'}
        </span>
      ),
    },
  ];

  if (loading && !messages.length) {
    return (
      <div className="space-y-6 p-6">
        <SkeletonLoader />
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>
        <Alert variant="error" message={error || 'Campaign not found'} />
      </div>
    );
  }

  const startIndex = pagination.total > 0
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 0;
  const endIndex = pagination.total > 0
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : 0;

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header with Status Filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/campaigns')} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Messages</h1>
            {campaign && (
              <p className="text-sm text-gray-600 mt-1">{campaign.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={!messages.length || exporting}
          >
            <Download className="h-5 w-5 mr-2" />
            {exporting ? 'Downloading...' : 'Download CSV'}
          </Button>
          {/* Status Filter Dropdown styled pill */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none h-10 pl-4 pr-10 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[150px]"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden">
        <Card>
          {error && <Alert variant="error" message={error} />}
          <div className="w-full max-w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Table
              columns={columns}
              data={messages}
              loading={loading}
              emptyMessage="No messages found for this campaign."
            />
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {startIndex} to {endIndex} of {pagination.total} entries
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>Rows per page</span>
              <div className="relative">
                <select
                  value={pageSize.toString()}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none h-9 pl-3 pr-9 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(1);
                }}
                disabled={page === 1}
                className="p-2"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                }}
                disabled={page === 1}
                className="p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, Math.max(1, pagination.totalPages)) }, (_, i) => {
                  let pageNum;

                  // Always show at least 5 page buttons when possible
                  if (pagination.totalPages <= 5) {
                    // Show all pages
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    // At the beginning, show pages 1-5
                    pageNum = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    // Near the end, show last 5 pages
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    // In the middle, show current page ± 2
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setPage(pageNum);
                      }}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                }}
                disabled={!hasNextPage}
                className="p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(pagination.totalPages);
                }}
                disabled={!hasNextPage || pagination.totalPages <= page}
                className="p-2"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
