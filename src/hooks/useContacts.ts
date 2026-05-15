import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { parseError } from '@/lib/utils';
import { Contact, ContactList, ContactTag } from '@/types';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 1,
  });

  const fetchContacts = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    list_ids?: string;
    tag_ids?: string;
    is_valid?: string;
  }) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.list_ids) queryParams.append('list_ids', params.list_ids);
      if (params?.tag_ids) queryParams.append('tag_ids', params.tag_ids);
      if (params?.is_valid) queryParams.append('is_valid', params.is_valid);

      const data = await api.get(`/admin/contacts?${queryParams.toString()}`);

      // Handle paginated response
      if (data.data && Array.isArray(data.data)) {
        setContacts(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setContacts(data.contacts || data || []);
      }
      return data;
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const getContact = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/contacts/${id}`);
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const create = async (contactData: Partial<Contact>) => {
    try {
      setLoading(true);
      const data = await api.post('/admin/contacts', contactData);
      await fetchContacts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, contactData: Partial<Contact>) => {
    try {
      setLoading(true);
      const data = await api.put(`/admin/contacts/${id}`, contactData);
      await fetchContacts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/admin/contacts/${id}`);
      await fetchContacts();
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const importContacts = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      const data = await api.post('/admin/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchContacts();
      return data;
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const data = await api.get('/admin/contacts/lists');
      setLists(data.lists || []);
      return data;
    } catch (err) {
      setError(parseError(err));
    }
  };

  const fetchTags = async () => {
    try {
      const data = await api.get('/admin/contacts/tags');
      setTags(data.tags || []);
      return data;
    } catch (err) {
      setError(parseError(err));
    }
  };

  const deleteList = async (id: string) => {
    try {
      setLoading(true);
      await api.deleteContactList(id);
      await fetchLists();
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteTag = async (id: string) => {
    try {
      setLoading(true);
      await api.deleteContactTag(id);
      await fetchTags();
    } catch (err) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchLists();
    fetchTags();
  }, []);

  return {
    contacts,
    lists,
    tags,
    loading,
    error,
    pagination,
    fetchContacts,
    getContact,
    create,
    update,
    delete: deleteContact,
    importContacts,
    fetchLists,
    fetchTags,
    deleteList,
    deleteTag,
  };
}
