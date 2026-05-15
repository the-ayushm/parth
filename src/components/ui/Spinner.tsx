import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
}

export default function Spinner({
  size = 'md',
  color = 'primary',
  className,
  ...props
}: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const colors = {
    primary: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent',
  };

  return (
    <div
      className={cn('inline-block', className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <div
        className={cn(
          'animate-spin rounded-full',
          sizes[size],
          colors[color]
        )}
      />
    </div>
  );
}

export function SpinnerOverlay({
  message = 'Loading...',
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && <p className="text-gray-700">{message}</p>}
      </div>
    </div>
  );
}
