'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        status: 'Active',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/users/${params.id}`);
                const userData = response.data || response;
                if (userData) {
                    setFormData({
                        name: userData.name || '',
                        email: userData.email || '',
                        role: userData.role || '',
                        status: userData.status ? userData.status.charAt(0).toUpperCase() + userData.status.slice(1) : 'Active',
                    });
                }
            } catch (err: any) {
                console.error(err);
                toast.error('Failed to load user data');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchUser();
        }
    }, [params.id]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            const payload = {
                ...formData,
                role: formData.role.toLowerCase(),
                status: formData.status.toLowerCase(),
            };

            const response = await api.put(`/users/${params.id}`, payload);

            if (response.data || response) {
                toast.success('User updated successfully');
                router.push('/user');
                router.refresh();
            } else {
                toast.error('Failed to update user');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'Failed to update user'
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold">Edit User</h1>
                </div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <h1 className="text-2xl font-bold">
                    Edit User
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
                        <option value="admin">Admin</option>
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
                        required
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3">
                    <Button type="submit">
                        Update User
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
