'use client';

import Badge from '@/components/ui/Badge';

interface Props {
    open: boolean;
    onClose: () => void;
    query: any;
}

export default function CustomerQueryViewDrawer({
    open,
    onClose,
    query,
}: Props) {
    if (!open || !query) return null;

    return (
        <div className="fixed inset-0 z-50">

            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            <div className="absolute right-0 top-0 h-full w-[650px] bg-white shadow-xl overflow-y-auto">

                <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                        Customer Query Details
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-black"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {query.data?.media && (
                        <div>
                            <h3 className="font-medium mb-2">
                                Uploaded Media
                            </h3>

                            <img
                                src={query.data.media}
                                alt="Complaint"
                                className="h-38 w-30 rounded-lg border object-cover"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">

                        <InfoCard
                            label="Name"
                            value={query.data?.name}
                        />

                        <InfoCard
                            label="Phone Number"
                            value={query.data?.phone_number}
                        />

                        <InfoCard
                            label="Address"
                            value={query.data?.address}
                        />

                        <InfoCard
                            label="Office Located"
                            value={query.data?.office_located}
                        />

                        <InfoCard
                            label="Language"
                            value={query.data?.native_language}
                        />

                        <div>
                            <p className="text-sm text-gray-500 mb-1">
                                Status
                            </p>

                            <Badge>
                                {query.status}
                            </Badge>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">
                            Complaint
                        </h3>

                        <div className="p-4 rounded-lg bg-gray-50 border">
                            {query.data?.complaint}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <InfoCard
                            label="Created At"
                            value={new Date(
                                query.created_at
                            ).toLocaleString()}
                        />

                        <InfoCard
                            label="Session ID"
                            value={query.id}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}

function InfoCard({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-sm text-gray-500 mb-1">
                {label}
            </p>

            <div className="p-3 border rounded-lg bg-gray-50">
                {value || '-'}
            </div>
        </div>
    );
}
