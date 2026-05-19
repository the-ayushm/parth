'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

export default function CreateUserPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        password: '',
        phone: '',
        status: 'Active',
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        try {
            setLoading(true);

            const payload = {
                ...formData,
                role: formData.role.toLowerCase(),
                status: formData.status.toLowerCase(),
            };

            const response = await api.post(
                '/admin/companies/user',
                payload
            );

            if (response.data) {

                toast.success(
                    response.data?.message ||
                    'User created successfully'
                );

                router.push('/user');

                router.refresh();

            } else {

                toast.error(
                    response.data?.message ||
                    'Something went wrong'
                );
            }

        } catch (err: any) {

            console.error(err);

            toast.error(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'Failed to create user'
            );

        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="p-6 max-w-2xl">
            {/* Success Message */}
            {message && (
                <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg">
                    {message}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <h1 className="text-2xl font-bold">
                    Create User
                </h1>
            </div>

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                className="space-y-5"
            >
                {/* Name */}
                <div className="space-y-2">
                    <label>Name</label>

                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2"
                        required
                    />
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label>Email</label>

                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label>Phone</label>

                    <input
                        type="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2"
                        required
                    />
                </div>


                {/* Role */}
                <div className="space-y-2">
                    <label>Role</label>

                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2"
                        required
                    >
                        <option value="">Select Role</option>
                        <option value="user">User</option>
                    </select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label>Status</label>

                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2"
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label>Password</label>

                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2"
                        required
                    />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3">
                    <Button type="submit">
                        Create User
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push('/user')}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>

    );
}
