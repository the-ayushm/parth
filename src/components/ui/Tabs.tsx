'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'line' | 'pills';
  className?: string;
}

export default function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onChange,
  variant = 'line',
  className,
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || tabs[0]?.id || ''
  );

  // Use activeTab if provided (controlled), otherwise use internal state
  const currentTab = activeTab ?? internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (!activeTab) {
      // Only update internal state if not controlled
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  const activeContent = tabs.find((tab) => tab.id === currentTab)?.content;

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Headers */}
      <div
        className={cn(
          'flex gap-1',
          variant === 'line' && 'border-b border-gray-200'
        )}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={currentTab === tab.id}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-lg',
              variant === 'line' && [
                'border-b-2 -mb-px',
                currentTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
              ],
              variant === 'pills' && [
                'rounded-lg',
                currentTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              ],
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
}
