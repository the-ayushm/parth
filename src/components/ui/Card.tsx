import { HTMLAttributes, ReactNode, ComponentType, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, hover = false, padding = 'md', ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-gray-200 shadow-sm',
          hover && 'transition-shadow hover:shadow-md',
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<any>;
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between mb-4', className)}
      {...props}
    >
      <div className="flex-1 flex items-start gap-3">
        {Icon && <Icon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />}
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
          {children}
        </div>
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> { }

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

export function CardFooter({
  divider = false,
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn(
        'mt-4',
        divider && 'pt-4 border-t border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
