import Badge from '@/components/ui/Badge';

interface StatusBadgeProps {
  status: string;
  type?: 'campaign' | 'template' | 'webhook' | 'waba' | 'phone' | 'general';
}

export default function StatusBadge({ status, type = 'general' }: StatusBadgeProps) {
  const getVariant = (status: string, type: string) => {
    const statusLower = status?.toLowerCase();

    // Campaign statuses
    if (type === 'campaign') {
      if (statusLower === 'completed') return 'success';
      if (statusLower === 'in_progress' || statusLower === 'sending') return 'info';
      if (statusLower === 'scheduled') return 'warning';
      if (statusLower === 'failed' || statusLower === 'cancelled') return 'danger';
      if (statusLower === 'draft') return 'secondary';
    }

    // Template statuses
    if (type === 'template') {
      if (statusLower === 'approved') return 'success';
      if (statusLower === 'pending') return 'warning';
      if (statusLower === 'rejected') return 'danger';
    }

    // Webhook statuses
    if (type === 'webhook') {
      if (statusLower === 'active') return 'success';
      if (statusLower === 'inactive') return 'secondary';
    }

    // WABA and Phone statuses
    if (type === 'waba' || type === 'phone') {
      if (statusLower === 'verified' || statusLower === 'active') return 'success';
      if (statusLower === 'pending') return 'warning';
      if (statusLower === 'suspended' || statusLower === 'failed') return 'danger';
      if (statusLower === 'inactive') return 'secondary';
    }

    // General statuses
    if (statusLower === 'active' || statusLower === 'success' || statusLower === 'completed') {
      return 'success';
    }
    if (statusLower === 'pending' || statusLower === 'processing' || statusLower === 'waiting') {
      return 'warning';
    }
    if (statusLower === 'failed' || statusLower === 'error' || statusLower === 'rejected') {
      return 'danger';
    }
    if (statusLower === 'inactive' || statusLower === 'disabled') {
      return 'secondary';
    }

    return 'default';
  };

  const formatStatus = (status: string) => {
    return status
      ?.split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Badge variant={getVariant(status, type)} dot>
      {formatStatus(status)}
    </Badge>
  );
}
