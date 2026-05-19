'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import api from '@/lib/api';

import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

import { Plus, Trash2, Pencil } from 'lucide-react';

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
};

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            const response = await api.get(
                '/admin/companies/user'
            );

            if (response.data?.success) {
                setUsers(response.data.data);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: string) => {
        try {

            await api.delete(
                `/admin/companies/user/${id}`
            );

            setUsers((prev) =>
                prev.filter((user) => user.id !== id)
            );

        } catch (err) {
            console.error(err);
        }
    };

    const columns: Column<User>[] = [
        {
            header: 'Name',
            accessor: 'name',
        },
        {
            header: 'Email',
            accessor: 'email',
        },
        {
            header: 'Role',
            accessor: 'role',
        },
        {
            header: 'Status',
            accessor: (row) => (
                <Badge
                    variant={
                        row.status === 'active'
                            ? 'success'
                            : 'danger'
                    }
                >
                    {row.status}
                </Badge>
            ),
        },
        {
            header: 'Actions',
            accessor: (row) => (
                <div className="flex gap-2">
                    <Link href={`/user/edit/${row.id}`}>
                        <Button size="sm">
                            <Pencil className="w-4 h-4" />
                        </Button>
                    </Link>

                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                            handleDelete(row.id)
                        }
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">
                    Users
                </h1>

                <Link href="/user/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                    </Button>
                </Link>
            </div>

            {/* Table */}
            <Card>
                <CardHeader title="Users Table" />

                <div className="p-6">
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <Table
                            columns={columns}
                            data={users}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
}
