'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Table, { Column } from '@/components/ui/Table';
import { ArrowLeft, BarChart3, Play, Pause, Calendar, Phone, MessageSquare, Send, X, Download, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Campaign } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesPagination, setMessagesPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const [stats, setStats] = useState({ sent_count: 0, delivered_count: 0, read_count: 0, failed_count: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [failedMessages, setFailedMessages] = useState<any[]>([]);
  const [failedLoading, setFailedLoading] = useState(false);
  const [failedStatusFilter, setFailedStatusFilter] = useState<string>('all');
  const [failedErrorMessageFilter, setFailedErrorMessageFilter] = useState<string>('');
  const [failedPage, setFailedPage] = useState(1);
  const [failedPageSize, setFailedPageSize] = useState(10);
  const [failedPagination, setFailedPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [failedHasNextPage, setFailedHasNextPage] = useState(false);
  const [failedExporting, setFailedExporting] = useState(false);

  // Failure reasons states
  const [failureReasons, setFailureReasons] = useState<any[]>([]);
  const [failureReasonsLoading, setFailureReasonsLoading] = useState(false);
  const [selectedFailureReason, setSelectedFailureReason] = useState<string | null>(null);
  const [selectedFailureReasonCount, setSelectedFailureReasonCount] = useState(0);
  const [failureReasonMessages, setFailureReasonMessages] = useState<any[]>([]);
  const [failureReasonMessagesLoading, setFailureReasonMessagesLoading] = useState(false);
  const [failureReasonPage, setFailureReasonPage] = useState(1);
  const [failureReasonPageSize, setFailureReasonPageSize] = useState(10);
  const [failureReasonPagination, setFailureReasonPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  // Button clicks states
  const [buttonClicksCount, setButtonClicksCount] = useState(0);
  const [buttonClicksLoading, setButtonClicksLoading] = useState(false);
  const [buttonClicksFilterActive, setButtonClicksFilterActive] = useState(false);
  const [buttonClicksData, setButtonClicksData] = useState<any[]>([]);
  const [buttonClicksPagination, setButtonClicksPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const fetchedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const scrollToTable = (status: string) => {
    setFailedStatusFilter(status);
    setFailedErrorMessageFilter('');
    setFailedPage(1);
    setButtonClicksFilterActive(false);
  };

  // Scroll to table when status filter or error message filter changes
  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      if (tableRef.current) {
        // Use window.scrollTo for more reliable scrolling
        const element = tableRef.current;
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementPosition - 150,
          behavior: 'smooth'
        });
      }
    }, 500);
    return () => clearTimeout(scrollTimer);
  }, [failedStatusFilter, failedErrorMessageFilter]);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
      // Fetch stats only once on mount using ref
      if (!fetchedRef.current) {
        fetchCampaignStats();
        fetchFailureReasons();
        fetchButtonClicks();
        fetchedRef.current = true;
      }
    }
  }, [id]);

  useEffect(() => {
    // Fetch messages when page, pageSize, status filter, or error message filter changes
    if (id && (stats.failed_count > 0 || stats.sent_count > 0 || stats.delivered_count > 0 || stats.read_count > 0)) {
      fetchFailedMessages(failedPage, failedPageSize, failedStatusFilter, failedErrorMessageFilter);
    }
  }, [failedPage, failedPageSize, failedStatusFilter, failedErrorMessageFilter, stats]);

  useEffect(() => {
    // Fetch button clicks data when button clicks filter is active
    if (id && buttonClicksFilterActive) {
      fetchButtonClicksTableData(1, 10);
    }
  }, [buttonClicksFilterActive]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      // Fetch campaign info
      const campaignResponse = await fetch(`https://consoleapinew.surefy.co/v1/admin/campaigns/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const campaignJson = await campaignResponse.json();
      console.log('Campaign API Response:', campaignJson);
      console.log('Campaign Data:', campaignJson.data);
      if (campaignJson.success) {
        setCampaign(campaignJson.data);
        
        // Fetch template details if template_id exists
        if (campaignJson.data.template_id) {
          fetchTemplateDetails(campaignJson.data.template_id, token);
        }
      }
    } catch (err: any) {
      console.error('Error fetching campaign data:', err);
      setError(err.message || 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId: string, token: string) => {
    try {
      setTemplateLoading(true);
      const templateResponse = await fetch(`https://consoleapinew.surefy.co/v1/admin/templates/${templateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const templateJson = await templateResponse.json();
      if (templateJson.success) {
        setTemplate(templateJson.data);
      }
    } catch (err: any) {
      console.error('Error fetching template data:', err);
      // Don't set error state as this is secondary data
    } finally {
      setTemplateLoading(false);
    }
  };

  const fetchCampaignStats = async () => {
    try {
      setStatsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      // Fetch stats from messages endpoints - make all 4 calls in parallel
      const statusTypes = ['sent', 'delivered', 'read', 'failed'];
      const statsData = { sent_count: 0, delivered_count: 0, read_count: 0, failed_count: 0 };

      const promises = statusTypes.map(status =>
        fetch(
          `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/messages?status=${status}&page=1&pageSize=10`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        ).then(res => res.json()).then(json => {
          if (json.success) {
            let count = 0;
            if (json.data && json.data.pagination && json.data.pagination.total !== undefined) {
              count = json.data.pagination.total;
            }
            return { status, count };
          }
          return { status, count: 0 };
        })
      );

      const results = await Promise.all(promises);
      results.forEach(({ status, count }) => {
        statsData[`${status}_count`] = count;
      });

      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching campaign stats:', err);
      setError(err.message || 'Failed to load campaign stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchFailureReasons = async () => {
    try {
      setFailureReasonsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      const response = await fetch(
        `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/failures`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const json = await response.json();
      console.log('Failure reasons API response:', json);
      if (json.success && json.data) {
        setFailureReasons(json.data);
      }
    } catch (err: any) {
      console.error('Error fetching failure reasons:', err);
    } finally {
      setFailureReasonsLoading(false);
    }
  };

  const fetchButtonClicks = async () => {
    try {
      setButtonClicksLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      const url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/buttonClicks?page=1&pageSize=10`;
      console.log('Fetching button clicks from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log('Button clicks response status:', response.status);

      if (!response.ok) {
        console.error('Button clicks API error:', response.statusText);
        setButtonClicksCount(0);
        return;
      }

      const json = await response.json();
      console.log('Button clicks API response:', json);

      // Extract total from pagination
      if (json.success && json.data && json.data.pagination) {
        const total = json.data.pagination.total;
        console.log('Button clicks total:', total);
        setButtonClicksCount(total);
      } else {
        console.warn('Unexpected response structure:', json);
        setButtonClicksCount(0);
      }
    } catch (err: any) {
      console.error('Error fetching button clicks:', err);
      setButtonClicksCount(0);
    } finally {
      setButtonClicksLoading(false);
    }
  };

  const fetchButtonClicksTableData = async (page: number = 1, pageSize: number = 10) => {
    try {
      setFailedLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      const url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/buttonClicks?page=${page}&pageSize=${pageSize}`;
      console.log('Fetching button clicks table data from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json();
      console.log('Button clicks table data response:', json);

      if (json.success) {
        // Handle both direct array and nested data structure
        let clicksData = json.data?.data || json.data || [];
        if (!Array.isArray(clicksData)) {
          clicksData = [];
        }

        console.log('Setting button clicks table data, count:', clicksData.length);
        setButtonClicksData(clicksData);

        if (json.data?.pagination) {
          setButtonClicksPagination(json.data.pagination);
        }
      }
    } catch (err: any) {
      console.error('Error fetching button clicks table data:', err);
      setButtonClicksData([]);
    } finally {
      setFailedLoading(false);
    }
  };

  const fetchFailedMessages = async (page: number = 1, pageSize: number = 10, status: string = 'failed', errorMessage: string = '') => {
    try {
      setFailedLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      console.log('fetchFailedMessages called with:', { page, pageSize, status, errorMessage });

      let url: string;

      // If error message filter is set, use the failures API
      if (errorMessage) {
        url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/failures/messages?error=${encodeURIComponent(errorMessage)}&page=${page}&pageSize=${pageSize}`;
      } else {
        // Otherwise use regular messages endpoint with status filter
        const statusParam = status !== 'all' ? `status=${status}&` : '';
        url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/messages?${statusParam}page=${page}&pageSize=${pageSize}`;
      }

      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json();
      console.log('Fetch response:', json);

      if (json.success) {
        // Handle both direct array and nested data structure
        let messagesData = json.data?.data || json.data || [];
        if (!Array.isArray(messagesData)) {
          messagesData = [];
        }

        console.log('Setting failed messages, count:', messagesData.length);
        setFailedMessages(messagesData);

        if (json.data?.pagination) {
          setFailedPagination(json.data.pagination);
          setFailedHasNextPage(json.data.pagination.hasNextPage || json.data.pagination.page < json.data.pagination.totalPages);
        }
      }
    } catch (err: any) {
      console.error('Error fetching failed messages:', err);
    } finally {
      setFailedLoading(false);
    }
  };

  const fetchFailureReasonMessages = async (errorMessage: string, page: number = 1, pageSize: number = 10) => {
    try {
      setFailureReasonMessagesLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      // Use the correct endpoint format
      const url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/failures/messages?error=${encodeURIComponent(errorMessage)}&page=${page}&pageSize=${pageSize}`;
      console.log('Fetching failure messages from:', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('API error status:', response.status);
        setFailureReasonMessages([]);
        return;
      }

      const json = await response.json();
      console.log('Full API Response:', json);

      if (json.success && json.data) {
        // Extract messages from the response
        let messagesData = [];

        if (Array.isArray(json.data)) {
          // If data is directly an array
          messagesData = json.data;
        } else if (json.data.data && Array.isArray(json.data.data)) {
          // If data.data is an array
          messagesData = json.data.data;
        }

        console.log('Messages to display:', messagesData);
        setFailureReasonMessages(messagesData);

        // Extract pagination
        if (json.data?.pagination) {
          setFailureReasonPagination(json.data.pagination);
        }
      } else {
        console.warn('No data in response');
        setFailureReasonMessages([]);
      }
    } catch (err: any) {
      console.error('Error fetching failure reason messages:', err);
      setFailureReasonMessages([]);
    } finally {
      setFailureReasonMessagesLoading(false);
    }
  };

  const handleExportFailedMessages = async () => {
    if (!id || failedExporting) return;

    const totalEntries = buttonClicksFilterActive ? buttonClicksPagination.total : failedPagination.total;
    if (totalEntries === 0) return;

    setFailedExporting(true);

    let allData: any[] = [];
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

      let url: string;

      // If button clicks filter is active
      if (buttonClicksFilterActive) {
        url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/buttonClicks?page=1&pageSize=${Math.max(10000, totalEntries || 10000)}`;
      } else if (failedErrorMessageFilter) {
        // If error message filter is set, use the failures API
        url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/failures/messages?error=${encodeURIComponent(failedErrorMessageFilter)}&page=1&pageSize=${Math.max(10000, totalEntries || 10000)}`;
      } else {
        // Otherwise use regular messages endpoint with status filter
        const statusParam = failedStatusFilter !== 'all' ? `status=${failedStatusFilter}&` : '';
        url = `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/messages?${statusParam}page=1&pageSize=${Math.max(10000, totalEntries || 10000)}`;
      }

      // Fetch all data in a single call with large pageSize
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await response.json();

      if (json.success) {
        allData = json.data?.data || json.data || [];
        console.log(`Exported ${allData.length} records in a single API call`);
      }
    } catch (err: any) {
      console.error('Error exporting data:', err);
    }

    if (!allData.length) return;

    let headers: string[] = [];
    let rows: any[] = [];

    if (buttonClicksFilterActive) {
      // Button clicks CSV headers and rows
      headers = ['Phone', 'Name', 'Message Type'];
      rows = allData.map((d) => [
        d.fromPhone || '',
        d.leadName || '',
        d.messageType || '',
      ]);
    } else {
      // Messages CSV headers and rows
      headers = [
        'Date',
        'Name',
        'Mobile',
        'Template',
        'Status',
        'Failed At',
        'Cost',
        'Error Code',
        'Message Error',
      ];
      rows = allData.map((m) => [
        m.sentAt ? format(new Date(m.sentAt), 'yyyy-MM-dd HH:mm') : '',
        m.leadName || '',
        m.phoneNumber || '',
        m.templateName || '',
        m.messageStatus || '',
        m.failedAt ? format(new Date(m.failedAt), 'yyyy-MM-dd HH:mm') : '',
        m.messageCost || '',
        m.messageErrorCode || m.errorCode || '',
        m.messageError || m.errorMessage || '',
      ]);
    }

    const escapeCell = (value: unknown) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buttonClicksFilterActive ? 'button_clicks' : 'campaign_messages'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFailedExporting(false);
  };
  const handlePause = async () => {
    try {
      setActionLoading(true);
      await api.post(`/admin/campaigns/${id}/pause`);
      setSuccess('Campaign paused successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading(true);
      await api.post(`/admin/campaigns/${id}/resume`);
      setSuccess('Campaign resumed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to resume campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchMessages = async (status: string) => {
    try {
      setSelectedStatus(status);
      setMessagesLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const response = await fetch(
        `https://consoleapinew.surefy.co/v1/admin/campaigns/${id}/messages?status=${status}&page=${messagesPagination.page}&pageSize=${messagesPagination.pageSize}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const json = await response.json();
      if (json.success) {
        setMessages(json.data?.data || []);
        // Handle pagination data from nested structure
        if (json.data && json.data.pagination) {
          setMessagesPagination(json.data.pagination);
        } else if (json.pagination) {
          setMessagesPagination(json.pagination);
        } else if (json.meta) {
          setMessagesPagination({ page: json.meta.page || 1, pageSize: json.meta.pageSize || 10, total: json.meta.total || 0 });
        }
      } else {
        setError(json.message || 'Failed to load messages');
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleTestCampaign = async () => {
    if (!testPhoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    try {
      setActionLoading(true);
      await api.testCampaign(id, testPhoneNumber);
      setSuccess('Test message sent successfully!');
      setShowTestModal(false);
      setTestPhoneNumber('');
    } catch (err: any) {
      setError(err.message || 'Failed to send test message');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' => {
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

  if (loading && !campaign) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/admin/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
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
          <Button variant="ghost" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign?.name}</h1>
            <p className="text-gray-600 mt-1">{campaign?.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(campaign?.status || '')}>
            {campaign?.status.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            onClick={() => setShowTestModal(true)}
          >
            <Send className="h-5 w-5 mr-2" />
            Test Campaign
          </Button>
          {/* {campaign?.status === 'running' && (
            <Button
              variant="outline"
              onClick={handlePause}
              isLoading={actionLoading}
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          )} */}
          {/* {campaign?.status === 'paused' && (
            <Button
              variant="primary"
              onClick={handleResume}
              isLoading={actionLoading}
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
          )} */}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert variant="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => scrollToTable('all')}
        >
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Recipients</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{campaign?.total_recipients || 0}</p>
          </div>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => scrollToTable('sent')}
        >
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Sent</p>
            {statsLoading ? (
              <div className="h-10 bg-gray-200 rounded mt-2 animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.sent_count || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {campaign?.total_recipients
                    ? Math.round((stats.sent_count / campaign.total_recipients) * 100)
                    : 0}% sent rate
                </p>
              </>
            )}
          </div>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => scrollToTable('delivered')}
        >
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Delivered</p>
            {statsLoading ? (
              <div className="h-10 bg-gray-200 rounded mt-2 animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.delivered_count || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.sent_count ? Math.round((stats.delivered_count / stats.sent_count) * 100) : 0}% delivery rate
                </p>
              </>
            )}
          </div>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => scrollToTable('read')}
        >
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Read</p>
            {statsLoading ? (
              <div className="h-10 bg-gray-200 rounded mt-2 animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.read_count || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.delivered_count ? Math.round((stats.read_count / stats.delivered_count) * 100) : 0}% read rate
                </p>
              </>
            )}
          </div>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setButtonClicksFilterActive(true);
            setFailedStatusFilter('all');
            setFailedErrorMessageFilter('');
            setFailedPage(1);
            // Scroll to table after a delay
            setTimeout(() => {
              if (tableRef.current) {
                const elementPosition = tableRef.current.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                  top: elementPosition - 150,
                  behavior: 'smooth'
                });
              }
            }, 500);
          }}
        >
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Button Click Rate</p>
            {buttonClicksLoading ? (
              <div className="h-10 bg-gray-200 rounded mt-2 animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-orange-600 mt-2">{buttonClicksCount || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {campaign?.total_recipients
                    ? Math.round((buttonClicksCount / campaign.total_recipients) * 100)
                    : 0}% click rate
                </p>
              </>
            )}
          </div>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => scrollToTable('failed')}
        >
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Failed</p>
            {statsLoading ? (
              <div className="h-10 bg-gray-200 rounded mt-2 animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed_count || 0}</p>
            )}
          </div>
        </Card>

        {/* Failure Reasons - Show on same row */}
        {failureReasonsLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))
        ) : failureReasons && failureReasons.length > 0 ? (
          failureReasons.map((reason, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setFailedStatusFilter('failed');
                setFailedErrorMessageFilter(reason.error_message);
                setFailedPage(1);
                setButtonClicksFilterActive(false);
              }}
            >
              <div className="p-6">
                <p className="text-sm font-medium text-gray-500 line-clamp-2">
                  {reason.error_message}
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">{reason.total}</p>
              </div>
            </Card>
          ))
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Information */}
        <Card>
          <CardHeader title="Campaign Information" icon={MessageSquare} />
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Campaign Name</label>
              <p className="text-base text-gray-900 mt-1">{campaign?.name}</p>
            </div>
            {campaign?.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-base text-gray-900 mt-1">{campaign.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusVariant(campaign?.status || '')}>
                  {campaign?.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            {campaign?.total_cost !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-500">Total Cost</label>
                <p className="text-base text-gray-900 mt-1">{campaign.total_cost} credits</p>
              </div>
            )}
            {templateLoading ? (
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            ) : template ? (
              <>
                {template?.name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Template Name</label>
                    <p className="text-base text-gray-900 mt-1">{template.name}</p>
                  </div>
                )}
                {template?.category && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Template Category</label>
                    <p className="text-base text-gray-900 mt-1">
                      <Badge variant="info">{template.category}</Badge>
                    </p>
                  </div>
                )}
              </>
            ) : null}
            {campaign?.status === 'paused' && campaign?.campaign_stop && (
              <div>
                <label className="text-sm font-medium text-gray-500">Campaign Paused Reason</label>
                <p className="text-base text-gray-900 mt-1">{campaign.campaign_stop}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Schedule & Timing */}
        <Card>
          <CardHeader title="Schedule & Timing" icon={Calendar} />
          <div className="p-6 space-y-4">
            {campaign?.scheduled_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Scheduled At</label>
                <p className="text-base text-gray-900 mt-1">
                  {format(new Date(campaign.scheduled_at), 'PPpp')}
                </p>
              </div>
            )}
            {campaign?.started_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Started At</label>
                <p className="text-base text-gray-900 mt-1">
                  {format(new Date(campaign.started_at), 'PPpp')}
                </p>
              </div>
            )}
            {campaign?.completed_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Completed At</label>
                <p className="text-base text-gray-900 mt-1">
                  {format(new Date(campaign.completed_at), 'PPpp')}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="text-base text-gray-900 mt-1">
                {campaign?.created_at && format(new Date(campaign.created_at), 'PPpp')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Campaign Messages/Button Clicks Table */}
      {stats && (stats.failed_count > 0 || stats.sent_count > 0 || stats.delivered_count > 0 || stats.read_count > 0) && (
        <Card ref={tableRef}>
          <div className="p-6 space-y-4">
            {/* Header with Download Button and Status Filter */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {buttonClicksFilterActive ? 'Button Clicks' : 'Campaign Messages'}
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportFailedMessages}
                  disabled={buttonClicksFilterActive ? !buttonClicksData.length : !failedMessages.length || failedExporting}
                >
                  <Download className="h-5 w-5 mr-2" />
                  {failedExporting ? 'Downloading...' : 'Download CSV'}
                </Button>
                {/* Status Filter Dropdown or Clear Button */}
                {buttonClicksFilterActive ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setButtonClicksFilterActive(false);
                      setFailedStatusFilter('all');
                      setFailedErrorMessageFilter('');
                    }}
                  >
                    Clear Filter
                  </Button>
                ) : (
                  <div className="relative">
                    <select
                      value={failedStatusFilter}
                      onChange={(e) => {
                        setFailedStatusFilter(e.target.value);
                        setFailedErrorMessageFilter('');
                        setFailedPage(1);
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
                )}
              </div>
            </div>

            {/* Table */}
            {failedLoading ? (
              <div className="space-y-4">
                <SkeletonLoader />
              </div>
            ) : (buttonClicksFilterActive ? buttonClicksData.length > 0 : failedMessages.length > 0) ? (
              <>
                <div className="overflow-x-auto">
                  <Table
                    data={buttonClicksFilterActive ? buttonClicksData : failedMessages}
                    columns={buttonClicksFilterActive ? [
                      {
                        key: 'fromPhone',
                        header: 'Phone',
                        width: '110px',
                        render: (row: any) => (
                          <span className="text-sm text-blue-600 truncate block">{row.fromPhone || '-'}</span>
                        ),
                      },
                      {
                        key: 'leadName',
                        header: 'Name',
                        width: '150px',
                        render: (row: any) => (
                          <span className="font-medium text-gray-900 truncate block">{row.leadName || '-'}</span>
                        ),
                      },
                      {
                        key: 'messageType',
                        header: 'Message Type',
                        width: '120px',
                        render: (row: any) => (
                          <Badge variant={row.messageType === 'button' ? 'info' : 'default'}>
                            {row.messageType || '-'}
                          </Badge>
                        ),
                      },
                    ] : [
                      {
                        key: 'sentAt',
                        header: 'Date',
                        width: '90px',
                        render: (row: any) => (
                          <span className="text-sm text-gray-600 truncate">
                            {row.sentAt ? format(new Date(row.sentAt), 'MMM dd, HH:mm') : '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'leadName',
                        header: 'Name',
                        width: '110px',
                        render: (row: any) => (
                          <span className="font-medium text-gray-900 truncate block">{row.leadName || '-'}</span>
                        ),
                      },
                      {
                        key: 'phoneNumber',
                        header: 'Mobile',
                        width: '95px',
                        render: (row: any) => (
                          <span className="text-sm text-blue-600 truncate block">{row.phoneNumber || '-'}</span>
                        ),
                      },
                      {
                        key: 'messageStatus',
                        header: 'Status',
                        width: '90px',
                        render: (row: any) => {
                          const status = (row.messageStatus || '').toLowerCase();
                          let variant: 'success' | 'info' | 'danger' | 'warning' | 'default' = 'default';
                          if (status === 'read') variant = 'success';
                          else if (status === 'delivered') variant = 'info';
                          else if (status === 'failed') variant = 'danger';
                          else if (status === 'sent') variant = 'warning';
                          else if (status === 'pending') variant = 'warning';
                          return <Badge variant={variant}>{row.messageStatus || '-'}</Badge>;
                        },
                      },
                      {
                        key: 'templateName',
                        header: 'Template',
                        width: '140px',
                        render: (row: any) => (
                          <span className="text-sm text-gray-600 truncate">{row.templateName || '-'}</span>
                        ),
                      },
                      {
                        key: 'failedAt',
                        header: 'Failed',
                        width: '100px',
                        render: (row: any) => (
                          <span className="text-sm text-gray-600 truncate">
                            {row.failedAt ? format(new Date(row.failedAt), 'MM/dd HH:mm') : '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'messageCost',
                        header: 'Cost',
                        width: '70px',
                        render: (row: any) => (
                          <span className="text-sm text-gray-600">{row.messageCost ? `${row.messageCost} credits` : '-'}</span>
                        ),
                      },
                      {
                        key: 'errorCode',
                        header: 'Error Code',
                        width: '100px',
                        render: (row: any) => (
                          <span className="text-sm text-gray-600 truncate">
                            {row.messageErrorCode || row.errorCode || '-'}
                          </span>
                        ),
                      },
                      {
                        key: 'messageError',
                        header: 'Message Error',
                        width: '160px',
                        render: (row: any) => (
                          <span className="text-sm text-gray-600 truncate">
                            {row.messageError || row.campaignError || row.errorMessage || '-'}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>

                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {(failedPage - 1) * failedPageSize + 1} to {Math.min(failedPage * failedPageSize, buttonClicksFilterActive ? buttonClicksPagination.total : failedPagination.total)} of {buttonClicksFilterActive ? buttonClicksPagination.total : failedPagination.total} entries
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>Rows per page</span>
                    <div className="relative">
                      <select
                        value={failedPageSize.toString()}
                        onChange={(e) => {
                          setFailedPageSize(Number(e.target.value));
                          setFailedPage(1);
                        }}
                        className="appearance-none h-9 pl-3 pr-9 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
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
                      onClick={() => setFailedPage(1)}
                      disabled={failedPage === 1}
                      className="p-2"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFailedPage(Math.max(1, failedPage - 1))}
                      disabled={failedPage === 1}
                      className="p-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, Math.max(1, buttonClicksFilterActive ? Math.ceil((buttonClicksPagination.total || 0) / failedPageSize) : failedPagination.totalPages)) }, (_, i) => {
                        const totalPages = buttonClicksFilterActive ? Math.ceil((buttonClicksPagination.total || 0) / failedPageSize) : failedPagination.totalPages;
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (failedPage <= 3) {
                          pageNum = i + 1;
                        } else if (failedPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = failedPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={failedPage === pageNum ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setFailedPage(pageNum)}
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
                      onClick={() => setFailedPage(failedPage + 1)}
                      disabled={!failedHasNextPage}
                      className="p-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFailedPage(buttonClicksFilterActive ? Math.ceil((buttonClicksPagination.total || 0) / failedPageSize) : failedPagination.totalPages)}
                      disabled={!failedHasNextPage || (buttonClicksFilterActive ? Math.ceil((buttonClicksPagination.total || 0) / failedPageSize) : failedPagination.totalPages) <= failedPage}
                      className="p-2"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-600 py-8">
                {buttonClicksFilterActive ? 'No button clicks found' : 'No messages found for this filter'}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Messages Modal */}
      {selectedStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {selectedStatus} Messages
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total: {messagesPagination.total} messages
                </p>
              </div>
              <button
                onClick={() => setSelectedStatus(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {msg.contact_name || 'No Name'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {msg.phone_number}
                          </p>
                          {msg.message_preview && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                              {msg.message_preview}
                            </p>
                          )}
                          {msg.timestamp && (
                            <p className="text-xs text-gray-400 mt-2">
                              {format(new Date(msg.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                          )}
                        </div>
                        {msg.status && (
                          <Badge variant="success" className="ml-2">
                            {msg.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">
                  No messages found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Campaign Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Campaign</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send a test message to verify your campaign template and configuration.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={actionLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTestModal(false);
                  setTestPhoneNumber('');
                }}
                disabled={actionLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleTestCampaign}
                isLoading={actionLoading}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Reason Messages Modal */}
      {selectedFailureReason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[80vh] overflow-auto shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedFailureReason}
                </h3>
                <p className="text-sm text-red-600 font-semibold mt-1">
                  Total: {selectedFailureReasonCount} messages
                </p>
              </div>
              <button
                onClick={() => setSelectedFailureReason(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-3 font-semibold text-gray-700">Lead Name</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Mobile</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Error Code</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failureReasonMessagesLoading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="p-3"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                        </tr>
                      ))
                    ) : failureReasonMessages && failureReasonMessages.length > 0 ? (
                      failureReasonMessages.map((msg, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3 text-gray-900">{msg.leadName || msg.contact_name || '-'}</td>
                          <td className="p-3 text-gray-600">{msg.phoneNumber || msg.fromPhone || '-'}</td>
                          <td className="p-3 text-gray-600">{msg.messageErrorCode || msg.errorCode || '-'}</td>
                          <td className="p-3 text-gray-600">{msg.messageError || msg.errorMessage || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-600">
                          No messages found for this error
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!failureReasonMessagesLoading && failureReasonMessages.length > 0 && failureReasonPagination.total > failureReasonPageSize && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {(failureReasonPage - 1) * failureReasonPageSize + 1} to {Math.min(failureReasonPage * failureReasonPageSize, failureReasonPagination.total)} of {failureReasonPagination.total} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.max(1, failureReasonPage - 1);
                        setFailureReasonPage(newPage);
                        fetchFailureReasonMessages(selectedFailureReason, newPage, failureReasonPageSize);
                      }}
                      disabled={failureReasonPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = failureReasonPage + 1;
                        setFailureReasonPage(newPage);
                        fetchFailureReasonMessages(selectedFailureReason, newPage, failureReasonPageSize);
                      }}
                      disabled={failureReasonMessages.length < failureReasonPageSize}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
