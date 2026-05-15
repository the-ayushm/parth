'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Table, { Column } from '@/components/ui/Table';
import { ArrowLeft, Building2, CreditCard, Users } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  business_id?: string;
  webhook_url?: string;
  credit_balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  created_at: string;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'credits'>('details');

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
      fetchTransactions();
    }
  }, [companyId]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/companies/${companyId}`);
      setCompany(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.getTransactions(companyId);
      setTransactions(response);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    }
  };

  const transactionColumns: Column<CreditTransaction>[] = [
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-900">
          {format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'credit' ? 'success' : row.type === 'debit' ? 'warning' : 'info'}>
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className={`font-medium ${row.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'credit' ? '+' : '-'}{Math.abs(row.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span className="text-sm text-gray-900">
          {row.balance_after.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.description || '-'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="error" message="Company not found" />
        <Button variant="ghost" onClick={() => router.push('/companies')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/companies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-600 mt-1">{company.email}</p>
        </div>
        <Badge variant={company.status === 'active' ? 'success' : 'danger'}>
          {company.status}
        </Badge>
      </div>

      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'credits'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCard className="h-4 w-4 inline mr-2" />
            Credit Transactions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <Card>
            <CardHeader title="Company Information" />
            <CardBody>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.email}</dd>
                </div>
                {company.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.phone}</dd>
                  </div>
                )}
                {company.business_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.business_id}</dd>
                  </div>
                )}
                {company.webhook_url && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">{company.webhook_url}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={company.status === 'active' ? 'success' : 'danger'}>
                      {company.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(company.created_at), 'MMM dd, yyyy HH:mm')}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {/* Credit Balance */}
          <Card>
            <CardHeader title="Credit Balance" />
            <CardBody>
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-10 w-10 text-primary-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {company.credit_balance.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mb-6">Available Credits</p>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/credits/add?company_id=${company.id}`)}
                  className="w-full"
                >
                  Add Credits
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'credits' && (
        <Card>
          <CardHeader
            title="Credit Transactions"
            description="View all credit transactions for this company"
          />
          <Table
            columns={transactionColumns}
            data={transactions}
            loading={false}
            emptyMessage="No transactions found."
          />
        </Card>
      )}
    </div>
  );
}
