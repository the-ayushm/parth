'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { Plus, Eye, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  credit_balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCompanies();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/companies');
      if (isMountedRef.current) {
        setCompanies(response.data || []);
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.error?.message || err.message || 'Failed to load companies');
      }
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.phone || '-'}</span>
      ),
    },
    {
      key: 'credit_balance',
      header: 'Credits',
      sortable: true,
      render: (row) => (
        <Badge variant={row.credit_balance > 0 ? 'success' : 'warning'}>
          {row.credit_balance.toLocaleString()}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
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
            onClick={() => router.push(`/companies/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
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
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">Manage companies and their settings</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/companies/new')}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Company
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Companies</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{companies.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Active Companies</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {companies.filter(c => c.status === 'active').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Credits</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {companies.reduce((sum, c) => sum + c.credit_balance, 0).toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="All Companies"
          description="View and manage all companies"
        />
        <Table
          columns={columns}
          data={companies}
          loading={loading}
          emptyMessage="No companies found. Create your first company to get started."
          onRowClick={(row) => router.push(`/companies/${row.id}`)}
        />
      </Card>
    </div>
  );
}
