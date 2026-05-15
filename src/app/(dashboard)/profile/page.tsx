'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { User, Building2, Key, Save } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, company, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    isMountedRef.current = true;
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await api.put('/auth/profile', profileData);
      if (isMountedRef.current) {
        setUser(response.data.data);
        setSuccess('Profile updated successfully');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to update profile');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      if (isMountedRef.current) {
        setError('New passwords do not match');
      }
      return;
    }

    try {
      setSaving(true);
      if (isMountedRef.current) {
        setError(null);
      }

      await api.post('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      if (isMountedRef.current) {
        setSuccess('Password changed successfully');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to change password');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert variant="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <form onSubmit={handleProfileSubmit}>
            <Card>
              <CardHeader title="Profile Information" icon={User} />
              <div className="p-6 space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  placeholder="john@example.com"
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  placeholder="+1234567890"
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={saving}
                  >
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </form>

          {/* Change Password */}
          <form onSubmit={handlePasswordSubmit}>
            <Card>
              <CardHeader title="Change Password" icon={Key} />
              <div className="p-6 space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                  placeholder="Enter current password"
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                  placeholder="Enter new password"
                  required
                  helperText="Minimum 8 characters"
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                  placeholder="Confirm new password"
                  required
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={saving}
                  >
                    <Key className="h-5 w-5 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Details */}
          <Card>
            <CardHeader title="Account Details" />
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <div className="mt-1">
                  <Badge variant={
                    user.role === 'superadmin' ? 'danger' :
                      user.role === 'admin' ? 'warning' :
                        'default'
                  }>
                    {user.role.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                    {user.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              {/* 
              <div>
                <label className="text-sm font-medium text-gray-500">User ID</label>
                <p className="text-sm text-gray-900 mt-1 font-mono">{user.id}</p>
              </div> */}
            </div>
          </Card>

          {/* Company Information */}
          {company && (
            <Card>
              <CardHeader title="Company Information" icon={Building2} />
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Name</label>
                  <p className="text-base text-gray-900 mt-1">{company.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-base text-gray-900 mt-1">{company.email}</p>
                </div>

                {company.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-base text-gray-900 mt-1">{company.phone}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Credit Balance</label>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {company.credit_balance}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={company.status === 'active' ? 'success' : 'danger'}>
                      {company.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
