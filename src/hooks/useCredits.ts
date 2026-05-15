import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { parseError } from '@/lib/utils';
import type { CreditTransaction } from '@/types';

export function useCredits(companyId?: string) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const data = await api.get(`/admin/credits/balance/${companyId}`);

      setBalance(data.data.balance || 0);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page = 1, limit = 10) => {
    if (!companyId) return;

    try {
      setLoading(true);
      const data = await api.get(`/admin/credits/transactions/${companyId}`, {
        params: { page, limit },
      });

      setTransactions(data.data || []);
      return data;
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const addCredit = async (amount: number, description: string) => {
    if (!companyId) throw new Error('Company ID is required');

    try {
      setLoading(true);
      const data = await api.post('/admin/credits/add', {
        company_id: companyId,
        amount,
        description,
      });
      await fetchBalance();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchBalance();
    }
  }, [companyId]);

  return {
    balance,
    transactions,
    loading,
    error,
    fetchBalance,
    fetchTransactions,
    addCredit,
  };
}
