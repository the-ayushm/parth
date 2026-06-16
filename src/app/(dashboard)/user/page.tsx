'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import api from '@/lib/api';

import { Card, CardHeader } from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';

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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    const fetchUsers = async () => {
        try {
            setLoading(true);

            const response = await api.get(
                `/admin/companies/user?role=user&page=${page}&limit=${limit}`
            );

            let userList: User[] = [];
            let totalPagesCount = 1;
            let totalItemsCount = 0;

            if (response) {
                // Case 1: Response is directly an array
                if (Array.isArray(response)) {
                    userList = response;
                    totalItemsCount = response.length;
                }
                // Case 2: Response has a success/data wrapper
                else {
                    const dataPayload = response.data;
                    const paginationPayload = response.pagination || (dataPayload && dataPayload.pagination);

                    // Extract user list
                    if (Array.isArray(dataPayload)) {
                        userList = dataPayload;
                    } else if (dataPayload && Array.isArray(dataPayload.users)) {
                        userList = dataPayload.users;
                    } else if (dataPayload && Array.isArray(dataPayload.data)) {
                        userList = dataPayload.data;
                    } else if (Array.isArray(response.users)) {
                        userList = response.users;
                    } else if (Array.isArray(response.data)) {
                        userList = response.data;
                    }

                    // Extract pagination info
                    if (paginationPayload) {
                        totalPagesCount = paginationPayload.total_pages || paginationPayload.totalPages || 1;
                        totalItemsCount = paginationPayload.total || paginationPayload.totalItems || userList.length;
                    } else {
                        totalItemsCount = userList.length;
                        totalPagesCount = Math.ceil(totalItemsCount / limit) || 1;
                    }
                }
            }

            setUsers(userList);
            setTotalPages(totalPagesCount || 1);
            setTotalItems(totalItemsCount || 0);

        } catch (err) {
            console.error(err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page]);

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
            key: 'name',
            header: 'Name',
        },
        {
            key: 'email',
            header: 'Email',
        },
        {
            key: 'role',
            header: 'Role',
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
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
            key: 'actions',
            header: 'Actions',
            render: (row) => (
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
                <div className="p-6">
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <>
                            <Table
                                columns={columns}
                                data={users}
                            />
                            {totalPages > 1 && (
                                <div className="mt-4">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={totalPages}
                                        onPageChange={(p) => setPage(p)}
                                        totalItems={totalItems}
                                        itemsPerPage={limit}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}
