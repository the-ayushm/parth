import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { parseError } from '@/lib/utils';
import { Campaign } from '@/types';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    try {
      setLoading(true);
      const data = await api.get('/admin/campaigns', { params });
      setCampaigns(data.campaigns || []);
      return data;
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const getCampaign = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/campaigns/${id}`);
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const create = async (campaignData: Partial<Campaign>) => {
    try {
      setLoading(true);
      const data = await api.post('/admin/campaigns', campaignData);
      await fetchCampaigns();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, campaignData: Partial<Campaign>) => {
    try {
      setLoading(true);
      const data = await api.put(`/admin/campaigns/${id}`, campaignData);
      await fetchCampaigns();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/admin/campaigns/${id}`);
      await fetchCampaigns();
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const test = async (id: string, testPhone: string) => {
    try {
      setLoading(true);
      const data = await api.post(`/admin/campaigns/${id}/test`, { testPhone });
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const send = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.post(`/admin/campaigns/${id}/send`);
      await fetchCampaigns();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.post(`/admin/campaigns/${id}/cancel`);
      await fetchCampaigns();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStats = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/campaigns/${id}/stats`);
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
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    getCampaign,
    create,
    update,
    delete: deleteCampaign,
    test,
    send,
    cancel,
    getStats,
  };
}
