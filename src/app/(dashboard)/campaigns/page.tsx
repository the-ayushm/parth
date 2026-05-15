'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Toast from '@/components/ui/Toast';
import { Plus, Eye, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Campaign } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const limit = 20;
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCampaigns();
    return () => {
      isMountedRef.current = false;
    };
  }, [page]);

  useEffect(() => {
    // Poll progress for running campaigns
    const hasRunningCampaigns = campaigns.some(c => c.status === 'running');

    if (hasRunningCampaigns) {
      // Increased to 5 seconds to reduce server load
      pollInterval.current = setInterval(() => {
        updateRunningCampaignsProgress();
      }, 5000);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [campaigns]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Direct API call - request deduplication handled in API client
      const response = await api.get(`/admin/campaigns?page=${page}&limit=${limit}`);

      // Normalize response
      let campaignsData = [];
      let totalPages = 1;
      let totalCampaigns = 0;

      if (response && response.data && Array.isArray(response.data)) {
        campaignsData = response.data;
        totalPages = response.pagination?.total_pages || 1;
        totalCampaigns = response.pagination?.total || response.data.length;
      } else if (Array.isArray(response)) {
        campaignsData = response;
        totalPages = 1;
        totalCampaigns = response.length;
      } else if (response && Array.isArray(response.campaigns)) {
        campaignsData = response.campaigns;
        totalPages = response.meta?.total_pages || 1;
        totalCampaigns = response.meta?.total || response.campaigns.length;
      } else if (response && response.data && Array.isArray(response.data.campaigns)) {
        campaignsData = response.data.campaigns;
        totalPages = response.data.meta?.total_pages || 1;
        totalCampaigns = response.data.meta?.total || response.data.campaigns.length;
      }

      if (isMountedRef.current) {
        setCampaigns(campaignsData);
        setTotalPages(totalPages);
        setTotalCampaigns(totalCampaigns);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const updateRunningCampaignsProgress = async () => {
    try {
      const runningCampaigns = campaigns.filter(c => c.status === 'running');
      if (runningCampaigns.length === 0) return;

      // Fetch all in parallel instead of sequential
      const progressResults = await Promise.allSettled(
        runningCampaigns.map(c => api.getCampaignProgress(c.id))
      );

      // Update state once with all results
      setCampaigns(prevCampaigns =>
        prevCampaigns.map((campaign, index) => {
          const result = progressResults[runningCampaigns.findIndex(rc => rc.id === campaign.id)];
          if (result?.status === 'fulfilled') {
            const progress = result.value;
            return {
              ...campaign,
              sent_count: progress.sent_count || campaign.sent_count,
              delivered_count: progress.delivered_count || campaign.delivered_count,
              read_count: progress.read_count || campaign.read_count,
              failed_count: progress.failed_count || campaign.failed_count,
              status: progress.status || campaign.status,
            };
          }
          return campaign;
        })
      );
    } catch (err) {
      // Silently fail for progress updates
      console.error('Failed to update campaign progress:', err);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      case 'scheduled':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.description || 'No description'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'scheduled_at',
      header: 'Schedule',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.scheduled_at
            ? format(new Date(row.scheduled_at), 'MMM dd, yyyy HH:mm')
            : row.started_at
              ? format(new Date(row.started_at), 'MMM dd, yyyy HH:mm')
              : '-'}
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
                  router.push(`/campaigns/${row.id}`);
                }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.status === 'completed') {
                    router.push(`/campaigns/${row.id}/stats`);
                  } else {
                    setToastMessage(`Campaign is ${row.status}`);
                  }
                }}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp broadcast campaigns</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/campaigns/new')}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{campaigns.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Running</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {campaigns.filter(c => c.status === 'running').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Scheduled</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {campaigns.filter(c => c.status === 'scheduled').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {campaigns.filter(c => c.status === 'completed').length}
            </p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="All Campaigns"
          description="View and manage your campaigns"
        />
        <Table
          columns={columns}
          data={campaigns}
          loading={loading}
          emptyMessage="No campaigns found. Create your first campaign to get started."
          onRowClick={(row) => router.push(`/campaigns/${row.id}`)}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {campaigns.length} of {totalCampaigns} campaigns
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={page === pageNum ? 'primary' : 'outline'}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
