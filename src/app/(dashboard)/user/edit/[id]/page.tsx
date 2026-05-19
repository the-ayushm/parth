'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function EditUserPage() {
    const router = useRouter();

    const params = useParams();

    const [formData, setFormData] = useState({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log('Updated User ID:', params.id);
        console.log(formData);

        router.push('/user');
    };

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
