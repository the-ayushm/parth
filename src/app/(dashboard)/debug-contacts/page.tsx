'use client';
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DebugContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get('/admin/contacts?page=1&limit=50');
        setContacts(response.data.contacts || response.data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching');
      }
    }
    load();
  }, []);

  return (
    <div className="p-10 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Debug Contacts</h1>
      {error && <p className="text-red-500 font-bold">{error}</p>}
      <pre id="contacts-json" className="bg-gray-100 p-4 rounded text-xs overflow-auto max-w-full">
        {JSON.stringify(contacts, null, 2)}
      </pre>
    </div>
  );
}
