'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useAuthStore } from '@/store/auth';
import { Mail, Lock, Phone } from 'lucide-react';

interface LoginFormData {
  identifier: string; // email or phone
  password: string;
}

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // login expects (identifier, password)
      await login(data.identifier, data.password);

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Login Type Toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => setLoginType('email')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginType === 'email'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setLoginType('phone')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginType === 'phone'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Phone
        </button>
      </div>

      {/* Email/Phone Input */}
      <Input
        label={loginType === 'email' ? 'Email Address' : 'Phone Number'}
        type={loginType === 'email' ? 'email' : 'tel'}
        placeholder={
          loginType === 'email' ? 'you@example.com' : '+62812345678'
        }
        leftIcon={loginType === 'email' ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
        error={errors.identifier?.message}
        {...register('identifier', {
          required: `${loginType === 'email' ? 'Email' : 'Phone'} is required`,
          pattern: loginType === 'email'
            ? {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              }
            : {
                value: /^\+?[1-9]\d{1,14}$/,
                message: 'Invalid phone number',
              },
        })}
      />

      {/* Password Input */}
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        leftIcon={<Lock className="h-5 w-5" />}
        error={errors.password?.message}
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 6,
            message: 'Password must be at least 6 characters',
          },
        })}
      />

      {/* Forgot Password Link */}
      <div className="flex items-center justify-end">
        <a
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Forgot password?
        </a>
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
        Sign In
      </Button>

      {/* Register Link */}
      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
          Sign up
        </a>
      </p>
    </form>
  );
}
