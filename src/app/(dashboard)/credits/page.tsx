'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import CreditBalanceCard from '@/components/shared/CreditBalanceCard';
import Badge from '@/components/ui/Badge';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { CreditTransaction } from '@/types';

export default function CreditsPage() {
  const router = useRouter();
  const { user, company } = useAuthStore();
  const isMountedRef = useRef(true);

  const companyId = user?.role === 'company' ? company?.id : undefined;
  const { balance, transactions, loading, fetchTransactions } = useCredits(companyId);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  useEffect(() => {
    isMountedRef.current = true;
    loadTransactions(currentPage);
    return () => {
      isMountedRef.current = false;
    };
  }, [currentPage]);

  const loadTransactions = async (page: number) => {
    const data = await fetchTransactions(page, limit);
    if (isMountedRef.current && data) {
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    }
  };

  const columns: Column<CreditTransaction>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm">
          {format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'credit' ? 'success' : 'danger'}>
          {row.type === 'credit' ? 'Credit' : 'Debit'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className={`font-semibold ${row.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'credit' ? '+' : '-'}
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
          }).format(row.amount)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.description}</span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Balance After',
      align: 'right',
      render: (row) => (
        <span className="text-sm font-medium">
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
          }).format(row.balance_after)}
        </span>
      ),
    },
  ];

  const canAddCredits = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credits</h1>
          <p className="text-gray-600 mt-1">Manage your credit balance and transaction history</p>
        </div>
        {canAddCredits && (
          <Button
            variant="primary"
            onClick={() => router.push('/credits/add')}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Credits
          </Button>
        )}
      </div>

      {/* Balance Card */}
      <div className="max-w-sm">
        <CreditBalanceCard balance={balance} />
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader
          title="Transaction History"
          description="View all credit transactions"
        />
        <Table
          columns={columns}
          data={transactions}
          loading={loading}
          emptyMessage="No transactions found"
        />
        {totalItems > limit && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={limit}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
}
