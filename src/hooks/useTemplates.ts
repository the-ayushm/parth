import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { parseError } from '@/lib/utils';
import { Template } from '@/types';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }) => {
    try {
      setLoading(true);
      const data = await api.get('/admin/templates', { params });
      setTemplates(data.templates || []);
      return data;
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const getTemplate = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/templates/${id}`);
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const create = async (templateData: Partial<Template>) => {
    try {
      setLoading(true);
      const data = await api.post('/admin/templates', templateData);
      await fetchTemplates();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sync = async (wabaId: string) => {
    try {
      setLoading(true);
      const data = await api.post(`/admin/templates/sync/${wabaId}`);
      await fetchTemplates();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const syncAuto = async () => {
    try {
      setLoading(true);
      // Fetch available WABA accounts
      const wabaResponse = await api.get('/admin/waba');
      const wabaAccounts = wabaResponse.data || [];
      
      if (wabaAccounts.length === 0) {
        throw new Error('No WABA account available. Please add a WABA account first.');
      }

      // Use the first WABA account
      const wabaId = wabaAccounts[0].id;
      
      // Sync templates for this WABA
      const data = await api.post('/admin/templates/sync', { waba_id: wabaId });
      await fetchTemplates();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/admin/templates/${id}`);
      await fetchTemplates();
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    getTemplate,
    create,
    sync,
    syncAuto,
    delete: deleteTemplate,
  };
}
