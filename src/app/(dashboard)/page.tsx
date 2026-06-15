'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user, company } = useAuthStore();
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const syncAttemptedRef = useRef(false);

  // Auto-sync templates after user login
  useEffect(() => {
    if (user && company && !syncAttemptedRef.current) {
      syncAttemptedRef.current = true;
      const autoSyncTemplates = async () => {
        try {
          // Fetch available WABA accounts
          const wabaResponse = await api.get('/admin/waba');
          const wabaAccounts = wabaResponse.data || [];

          if (wabaAccounts.length > 0) {
            // Use the first WABA account to sync templates
            const wabaId = wabaAccounts[0].id;
            await api.post('/admin/templates/sync', { waba_id: wabaId });
            console.log('Templates synced automatically after login');
          }
        } catch (error) {
          console.error('Failed to auto-sync templates:', error);
          // Non-blocking error - don't interrupt user experience
        }
      };

      autoSyncTemplates();
    }
  }, [user, company]);

  useEffect(() => {
    isMountedRef.current = true;
    const fetchBalance = async () => {
      if (company?.id) {
        try {
          const data = await api.getCreditBalance(company.id);

          if (isMountedRef.current) {
            setBalance(data);
          }
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      } else {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchBalance();
    return () => {
      isMountedRef.current = false;
    };
  }, [company]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Credit Balance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Credit Balance</h3>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-200 rounded w-24"></div>
          ) : (
            <p className="text-3xl font-bold text-primary-600">
              {formatCurrency(balance?.balance || 0)}
            </p>
          )}
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Your Account</h3>
          <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-600 mt-1">{user?.email || user?.phone}</p>
        </div>

        {/* Company Info Card */}
        {company && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Company</h3>
            <p className="text-lg font-semibold text-gray-900">{company.name}</p>
            <p className="text-sm text-gray-600 mt-1">{company.email}</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/contacts"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h3 className="font-medium text-gray-900">Manage Contacts</h3>
            <p className="text-sm text-gray-600 mt-1">Import and organize contacts</p>
          </a>

          <a
            href="/campaigns"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h3 className="font-medium text-gray-900">Create Campaign</h3>
            <p className="text-sm text-gray-600 mt-1">Start a new WhatsApp campaign</p>
          </a>

          <a
            href="/templates"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h3 className="font-medium text-gray-900">Message Templates</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage templates</p>
          </a>

          <a
            href="/credits"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
          >
            <h3 className="font-medium text-gray-900">View Transactions</h3>
            <p className="text-sm text-gray-600 mt-1">Check credit usage history</p>
          </a>
        </div>
      </div> */}
    </div>
  );
}
