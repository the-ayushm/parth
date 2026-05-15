'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string | ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function Alert({
  variant = 'info',
  title,
  message,
  onClose,
  className,
}: AlertProps) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const variants = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variants[variant],
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className={cn('flex-shrink-0', iconColors[variant])}>
          {icons[variant]}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className="text-sm">{message}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export interface ToastProps extends AlertProps {
  isVisible: boolean;
  duration?: number;
}

export function Toast({
  isVisible,
  variant = 'info',
  title,
  message,
  onClose,
  duration = 5000,
}: ToastProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <Alert
        variant={variant}
        title={title}
        message={message}
        onClose={onClose}
        className="shadow-lg min-w-[300px]"
      />
    </div>
  );
}
