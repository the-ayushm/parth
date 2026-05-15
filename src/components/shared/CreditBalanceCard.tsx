import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Wallet } from 'lucide-react';

interface CreditBalanceCardProps {
  balance: number;
  currency?: string;
}

export default function CreditBalanceCard({
  balance,
  currency = 'INR',
}: CreditBalanceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <span className="text-sm font-medium opacity-90">
            Credit Balance
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
        <p className="text-sm opacity-75 mt-1">Available credits</p>
      </CardBody>
    </Card>
  );
}
