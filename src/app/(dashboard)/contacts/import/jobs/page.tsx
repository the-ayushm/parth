'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';

interface ImportJob {
  id: string;
  job_id?: string;
  job_type: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  list_name?: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  progress_percentage: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
}

export default function ImportJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Auto refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      if (!loading) setRefreshing(true);
      const response = await api.getImportJobs();
      setJobs(Array.isArray(response) ? response : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load import jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'queued':
        return <Badge variant="info">Queued</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const columns: Column<ImportJob>[] = [
    {
      key: 'status_icon',
      header: '',
      width: '50px',
      render: (row) => (
        <div className="flex items-center justify-center">
          {getStatusIcon(row.status)}
        </div>
      ),
    },
    {
      key: 'list_info',
      header: 'Job Details',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.list_name || 'Unnamed List'}</p>
          <p className="text-sm text-gray-500">{row.file_name}</p>
          <p className="text-xs text-gray-400 mt-1">Type: {row.job_type}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'progress',
      header: 'Progress',
      width: '200px',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{row.processed_rows || 0} / {row.total_rows || 0}</span>
            <span className="font-medium text-gray-900">{row.progress_percentage || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${row.progress_percentage || 0}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'results',
      header: 'Results',
      width: '220px',
      render: (row) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total:</span>
            <span className="font-medium text-gray-900">{row.total_rows}</span>
          </div>
          {row.successful_rows > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓ Success: {row.successful_rows}</span>
            </div>
          )}
          {row.failed_rows > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-red-600">✗ Failed: {row.failed_rows}</span>
            </div>
          )}
          {row.skipped_rows > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">⊘ Skipped: {row.skipped_rows}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      width: '160px',
      render: (row) => (
        <div className="text-sm text-gray-600">
          {format(new Date(row.created_at), 'MMM dd, HH:mm')}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Job Progress</h1>
          <p className="text-gray-600 mt-1">Track your contact import jobs</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchJobs}
          isLoading={refreshing}
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Table */}
      <Card>
        <CardHeader
          title="All Import Jobs"
          description={`View and track your contact import job progress (${jobs.length} total)`}
        />
        <Table
          columns={columns}
          data={jobs}
          loading={loading}
          emptyMessage="No import jobs found. Start importing contacts to see job progress here."
        />
      </Card>
    </div>
  );
}
