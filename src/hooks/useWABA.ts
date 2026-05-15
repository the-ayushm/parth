import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { parseError } from '@/lib/utils';
import { WABAAccount } from '@/types';

export function useWABA() {
  const [accounts, setAccounts] = useState<WABAAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const data = await api.get('/admin/waba', { params: { page, limit } });
      setAccounts(data.data || []);
      return data;
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const getAccount = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/waba`);
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const create = async (accountData: Partial<WABAAccount>) => {
    try {
      setLoading(true);
      const data = await api.post('/admin/waba', accountData);
      await fetchAccounts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, accountData: Partial<WABAAccount>) => {
    try {
      setLoading(true);
      const data = await api.put(`/admin/waba/${id}`, accountData);
      await fetchAccounts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const syncPhoneNumbers = async (wabaId: string) => {
    try {
      setLoading(true);
      const data = await api.post(`/admin/waba/${wabaId}/sync-phone-numbers`);
      await fetchAccounts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.delete(`/admin/waba/${id}`);
      await fetchAccounts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sync = async (id: string) => {
    return syncPhoneNumbers(id);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    getAccount,
    create,
    update,
    syncPhoneNumbers,
    deleteAccount,
    sync,
  };
}
