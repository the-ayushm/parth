'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, User, LogOut, Settings, Menu, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { user, company, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (company?.id) {
        try {
          const data = await api.getCreditBalance(company.id);
          setBalance(data?.balance || 0);
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        } finally {
          setLoadingBalance(false);
        }
      } else {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [company]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Menu button for mobile */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-sm text-gray-500">
              {user?.role === 'superadmin' && 'Super Administrator'}
              {user?.role === 'admin' && 'Administrator'}
              {user?.role === 'company' && company?.name}
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          {/* Credit Balance */}
          <Link
            href="/credits"
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <Wallet className="h-4 w-4 text-blue-600" />
            {loadingBalance ? (
              <div className="animate-pulse h-4 bg-blue-200 rounded w-20"></div>
            ) : (
              <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                {formatCurrency(balance)}
              </span>
            )}
          </Link>

          {/* Company Info */}
          {company && (
            <div className="text-sm text-gray-600">
              {company.name}
            </div>
          )}

          {/* Notifications */}
          <button className="relative text-gray-600 hover:text-gray-900">
            <Bell className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.email || user?.phone}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>

                  <div className="border-t border-gray-200 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
