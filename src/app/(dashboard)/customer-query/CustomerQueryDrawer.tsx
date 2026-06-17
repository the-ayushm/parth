'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

interface Props {
    open: boolean;
    onClose: () => void;
    query: any;
    onSuccess: () => void;
}

export default function CustomerQueryDrawer({
    open,
    onClose,
    query,
    onSuccess
}: Props) {
    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query) {
            setStatus(query.status);
        }
    }, [query]);

    if (!open || !query) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);

            await api.put(
                `/admin/session/${query.id}/data`,
                {
                    status,
                    notes
                }
            );

            onSuccess();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50">

            <div
                className="absolute inset-0 bg-black/30"
                onClick={onClose}
            />

            <div className="absolute right-0 top-0 h-full w-[500px] bg-white shadow-xl overflow-y-auto">

                <div className="p-6 border-b">

                    <h2 className="text-xl font-semibold">
                        Update Query
                    </h2>

                </div>

                <div className="p-6 space-y-5">

                    {query.data.media && (
                        <img
                            src={query.data.media}
                            className="w-full rounded-lg border"
                            alt=""
                        />
                    )}

                    <div>
                        <label>Name</label>

                        <input
                            disabled
                            value={query.data.name}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div>
                        <label>Complaint</label>

                        <textarea
                            disabled
                            value={query.data.complaint}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div>
                        <label>Status</label>

                        <select
                            className="w-full border rounded p-2"
                            value={status}
                            onChange={e =>
                                setStatus(e.target.value)
                            }
                        >
                            <option value="pending">
                                Pending
                            </option>

                            <option value="in_progress">
                                In Progress
                            </option>

                            <option value="resolved">
                                Resolved
                            </option>

                            <option value="rejected">
                                Rejected
                            </option>
                        </select>
                    </div>

                    <div>
                        <label>Notes</label>

                        <textarea
                            rows={4}
                            value={notes}
                            onChange={e =>
                                setNotes(e.target.value)
                            }
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        isLoading={loading}
                        className="w-full"
                    >
                        Update Query
                    </Button>

                </div>
            </div>
        </div>
    );
}
