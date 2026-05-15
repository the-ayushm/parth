'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select, { SelectOption } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { api } from '@/lib/api';

interface AddCreditForm {
  companyId: string;
  amount: number;
  description: string;
}

export default function AddCreditsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AddCreditForm>();

  const selectedCompanyId = watch('companyId');
  const { addCredit } = useCredits(selectedCompanyId);

  // Check if user has permission
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      router.push('/credits');
    }
  }, [user, router]);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get('/admin/companies');
        const companyOptions: SelectOption[] = response.data.map((company: any) => ({
          value: company.id,
          label: `${company.name} (${company.email})`,
        }));
        setCompanies(companyOptions);
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      }
    };

    fetchCompanies();
  }, []);

  const onSubmit = async (data: AddCreditForm) => {
    try {
      setLoading(true);
      setError(null);

      await addCredit(Number(data.amount), data.description);

      setSuccess(true);
      reset();

      setTimeout(() => {
        router.push('/credits');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add credits');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return null;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Credits</h1>
        <p className="text-gray-600 mt-1">Add credits to a company account</p>
      </div>

      <Card>
        <CardHeader
          title="Credit Information"
          description="Fill in the details to add credits"
        />
        <CardBody>
          {error && (
            <Alert
              variant="error"
              message={error}
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}

          {success && (
            <Alert
              variant="success"
              message="Credits added successfully! Redirecting..."
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Selection */}
            <Select
              label="Company"
              placeholder="Select a company"
              options={companies}
              error={errors.companyId?.message}
              {...register('companyId', {
                required: 'Company is required',
              })}
            />

            {/* Amount */}
            <Input
              label="Amount"
              type="number"
              placeholder="Enter amount"
              error={errors.amount?.message}
              helperText="Enter the credit amount to add"
              {...register('amount', {
                required: 'Amount is required',
                min: {
                  value: 1,
                  message: 'Amount must be at least 1',
                },
                valueAsNumber: true,
              })}
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Enter description for this transaction"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('description', {
                  required: 'Description is required',
                })}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/credits')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
              >
                Add Credits
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
