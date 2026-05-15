'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  Smartphone,
  MessageSquare,
  Webhook,
  Users,
  Send,
  User,
  Code,
  Briefcase,
} from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Credits',
    href: '/credits',
    icon: Wallet,
  },
  {
    label: 'WABA Accounts',
    href: '/waba',
    icon: Smartphone,
  },
  {
    label: 'Phone Numbers',
    href: '/phone-numbers',
    icon: Smartphone,
  },
  {
    label: 'Templates',
    href: '/templates',
    icon: MessageSquare,
  },
  {
    label: 'Webhooks',
    href: '/webhooks',
    icon: Webhook,
  },
  {
    label: 'Contacts',
    href: '/contacts',
    icon: Users,
  },
  {
    label: 'Jobs',
    href: '/jobs',
    icon: Briefcase,
  },
  {
    label: 'Campaigns',
    href: '/campaigns',
    icon: Send,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    label: 'Developer',
    href: '/developer',
    icon: Code,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-white flex items-center justify-center">
            <Image
              src="/images/logo/logo.jpeg"
              alt="Surefy"
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
          <span className="text-lg font-semibold tracking-tight group-hover:text-gray-300 transition-colors">
            Surefy
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 text-center">
          Surefy Console v1.0.0
        </p>
      </div>
    </aside>
  );
}
