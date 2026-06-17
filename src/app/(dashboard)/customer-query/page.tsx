'use client';

import { useEffect, useState } from 'react';
import {
    RefreshCw,
    Pencil
} from 'lucide-react';

import api from '@/lib/api';

import Button from '@/components/ui/Button';
import Table, { Column } from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import CustomerQueryDrawer from "./CustomerQueryDrawer"
import CustomerQueryViewDrawer from './CustomerQueryViewDrawer';

interface CustomerQuery {
    id: string;
    phone_number: string;
    status: string;
    created_at: string;

    data: {
        name: string;
        media: string;
        address: string;
        complaint: string;
        phone_number: string;
        office_located: string;
        native_language: string;
    };
}

export default function CustomerQueryPage() {
    const [queries, setQueries] = useState<CustomerQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);

    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
        limit: 10
    });

    const [selectedQuery, setSelectedQuery] =
        useState<CustomerQuery | null>(null);

    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        fetchQueries(page);
    }, [page]);

    const fetchQueries = async (currentPage = 1) => {
        try {
            setRefreshing(true);

            const response = await api.get(
                `/admin/session/data?page=${currentPage}&limit=10`
            );

            setQueries(response.data.data || []);

            setPagination(
                response.pagination || {
                    total: response.data?.length || 0,
                    totalPages: 1,
                    limit: 10
                }
            );

            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved':
                return <Badge variant="success">Resolved</Badge>;

            case 'pending':
                return <Badge variant="warning">Pending</Badge>;

            case 'rejected':
                return <Badge variant="danger">Rejected</Badge>;

            default:
                return <Badge>{status}</Badge>;
        }
    };

    const columns: Column<CustomerQuery>[] = [
        {
            key: 'name',
            header: 'Name',
            render: row => row.data?.name
        },

        {
            key: 'phone',
            header: 'Phone',
            render: row => row.data?.phone_number
        },

        {
            key: 'address',
            header: 'Address',
            render: row => row.data?.address
        },

        {
            key: 'office',
            header: 'Office',
            render: row => row.data?.office_located
        },

        {
            key: 'language',
            header: 'Language',
            render: row => row.data?.native_language
        },

        {
            key: 'complaint',
            header: 'Complaint',
            render: row => (
                <div className="max-w-[250px] truncate">
                    {row.data?.complaint}
                </div>
            )
        },

        {
            key: 'media',
            header: 'Media',

            render: row =>
                row.data?.media ? (
                    <img
                        src={row.data.media}
                        className="h-14 w-14 rounded object-cover border"
                        alt=""
                    />
                ) : (
                    '-'
                )
        },

        {
            key: 'status',
            header: 'Status',
            render: row => getStatusBadge(row.status)
        },

        {
            key: 'action',
            header: 'Actions',

            render: row => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setSelectedQuery(row);
                            setViewOpen(true);
                        }}
                    >
                        View
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedQuery(row);
                            setDrawerOpen(true);
                        }}
                    >
                        <Pencil className="h-4 w-4 mr-1" />
                        Update
                    </Button>
                </div>
            )
        }
    ];

    return (
        <>
            <div className="space-y-6">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Customer Queries
                        </h1>

                        <p className="text-gray-500">
                            Manage customer complaints
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => fetchQueries(page)}
                        isLoading={refreshing}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {error && (
                    <Alert
                        variant="error"
                        message={error}
                        onClose={() => setError(null)}
                    />
                )}

                <Card>
                    <CardHeader
                        title="Customer Query List"
                        description={`${queries.length} Records`}
                    />

                    <Table
                        columns={columns}
                        data={queries}
                        loading={loading}
                        emptyMessage="No customer queries found"
                    />

                    {/* Pagination */}

                    <div className="flex justify-between items-center p-4 border-t">

                        <p className="text-sm text-gray-500">
                            Page {page} of {pagination.totalPages}
                        </p>

                        <div className="flex gap-2">

                            <Button
                                variant="outline"
                                disabled={page === 1}
                                onClick={() =>
                                    setPage(prev => prev - 1)
                                }
                            >
                                Previous
                            </Button>

                            <Button
                                variant="outline"
                                disabled={
                                    page === pagination.totalPages
                                }
                                onClick={() =>
                                    setPage(prev => prev + 1)
                                }
                            >
                                Next
                            </Button>

                        </div>
                    </div>
                </Card>
            </div>

            <CustomerQueryDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                query={selectedQuery}
                onSuccess={() => fetchQueries(page)}
            />

            <CustomerQueryViewDrawer
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                query={selectedQuery}
            />
        </>
    );
}
