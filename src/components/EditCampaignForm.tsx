"use client";

import { useState } from "react";

type CampaignType = {
  id: string;
  name: string;
  type: string;
  scheduled_at: string | null;
  startTime?: string | null;
};

type EditCampaignFormProps = {
  campaign: CampaignType;
  onSave: (updated: Partial<CampaignType>) => void;
  onCancel: () => void;
};

export function EditCampaignForm({
  campaign,
  onSave,
  onCancel,
}: EditCampaignFormProps) {
  const [name, setName] = useState(campaign.name);
  const [type, setType] = useState(campaign.type);

  const [startDate, setStartDate] = useState(
    campaign.scheduled_at ? campaign.scheduled_at.split("T")[0] : "",
  );

  const [startTime, setStartTime] = useState(
    campaign.scheduled_at
      ? new Date(campaign.scheduled_at).toISOString().slice(11, 16)
      : "09:00",
  );

  function handleSave() {
    onSave({
      name,
      type,
      scheduled_at: startDate, // send raw "YYYY-MM-DD"
      startTime, // send "HH:mm"
    });
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Edit Campaign</h2>
      </div>

      <div className="p-6 max-h-[80vh] overflow-y-auto flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-gray-700">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-gray-700">
          Type
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-gray-700">
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-gray-700">
            Start Time
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white! rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
