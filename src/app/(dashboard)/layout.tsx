'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Wallet,
  Building2,
  Smartphone,
  MessageSquare,
  Inbox,
  Webhook,
  Users,
  Send,
  User,
  Code,
  Briefcase,
  Menu,
  X,
  Contact,
  PhoneIcon,
  MessageCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, company, logout, checkAuth, isLoading } = useAuthStore();
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  console.log("Users", user)

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const isCompanyUser = user?.role === 'company';

  useEffect(() => {
    // Only re-verify with the server if not already authenticated.
    // Persisted Zustand state from localStorage is trusted on first render.
    if (!isAuthenticated) {
      checkAuth();
    } else {
      // Already authenticated — make sure isLoading is cleared
      useAuthStore.setState({ isLoading: false, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Run only once on mount — not reactive to isAuthenticated changes

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'w-64 bg-white border-r border-gray-200 fixed h-full z-40 overflow-y-auto transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              <Image
                src="/images/logo/chotu-logo.jpeg"
                alt="Chotu"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
              Chotu
            </h1>
          </Link>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="px-4 space-y-1 mt-4 pb-8">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/inbox"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/inbox')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <Wallet className="h-5 w-5" />
            <span>Inbox</span>
          </Link>


          {/*
          <Link
            href="/contacts"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/contacts')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <Users className="h-5 w-5" />
            <span>Contacts</span>
          </Link> */}

          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <>
              <Link
                href="/waba"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/waba')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Smartphone className="h-5 w-5" />
                <span>WABA Accounts</span>
              </Link>

              <Link
                href="/customer-query"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/customer-query')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <MessageCircle className="h-5 w-5" />
                <span>Customer Query</span>
              </Link>

              <Link
                href="/phone-numbers"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/phone-numbers')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Smartphone className="h-5 w-5" />
                <span>Phone Numbers</span>
              </Link>

              <Link
                href="/contacts"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/contacts')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Users className="h-5 w-5" />
                <span>Contacts</span>
              </Link>


              <Link
                href="/user"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/jobs')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Briefcase className="h-5 w-5" />
                <span>User</span>
              </Link>


              {/* <Link
                href="/credits"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/credits')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Wallet className="h-5 w-5" />
                <span>Credits</span>
              </Link> */}





              {/* <Link
                href="/webhooks"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/webhooks')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Webhook className="h-5 w-5" />
                <span>Webhooks</span>
              </Link> */}


            </>
          )}


          {/* <Link
            href="/templates"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/templates')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Templates</span>
          </Link>

          <Link
            href="/campaigns"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/campaigns')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <Send className="h-5 w-5" />
            <span>Campaigns</span>
          </Link> */}


          {isCompanyUser && (
            <>
              {/* <Link
                href="/jobs"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/jobs')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Briefcase className="h-5 w-5" />
                <span>Jobs</span>
              </Link> */}



              <Link
                href="/inbox"
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive('/inbox')
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                )}
              >
                <Inbox className="h-5 w-5" />
                <span>Inbox</span>
              </Link>
            </>
          )}

          <Link
            href="/profile"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/profile')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Link>

          {/* <Link
            href="/contacts"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              isActive('/contacts')
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
            )}
          >
            <Users className="h-5 w-5" />
            <span>Contacts</span>
          </Link> */}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>

            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex-1">
              Welcome, {user?.name}
            </h2>

            <div className="flex items-center gap-2 lg:gap-4">
              {/* Credit Balance */}
              <Link
                href="/credits"
                className="flex items-center gap-2 px-2 lg:px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group text-xs lg:text-sm"
              >
                <Wallet className="h-4 w-4 text-blue-600" />
                {loadingBalance ? (
                  <div className="animate-pulse h-4 bg-blue-200 rounded w-20"></div>
                ) : (
                  <span className="font-semibold text-blue-600 group-hover:text-blue-700 hidden sm:inline">
                    {formatCurrency(balance)}
                  </span>
                )}
              </Link>

              {company && (
                <span className="text-xs lg:text-sm text-gray-600 hidden md:inline">
                  {company.name}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-3 lg:px-4 py-2 text-xs lg:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={clsx('overflow-x-hidden', pathname === '/inbox' ? 'p-0' : 'p-4 lg:p-8')}>{children}</main>
      </div>
    </div>
  );
}
