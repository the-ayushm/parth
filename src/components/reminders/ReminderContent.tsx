"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  X,
} from "lucide-react";
// import "/app/reminder/reminder.css";
import { useRouter } from "next/navigation";
type ReminderContentProps = {
  showClose?: boolean;
  onClose?: () => void;
};

export function ReminderContent({ showClose, onClose }: ReminderContentProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: "John Doe",
      date: "2025-11-15",
      time: "10:00 AM",
      reminderName: "Team Meeting",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.reminderName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleView = (id: number) => console.log("View reminder:", id);
  const handleEdit = (id: number) => console.log("Edit reminder:", id);
  const handleDelete = (id: number) => {
    if (confirm("Delete this reminder?")) {
      setContacts(contacts.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="reminder-container w-full h-full relative">
      {/* ❌ Close button — ONLY when showClose = true */}
      {showClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-8 p-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
          aria-label="Close reminders and go back"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      )}

      <div className="max-w-400 mx-auto">
        {/* HEADER */}
        <div className="mb-6 shrink-0">
          <h1 className="text-3xl font-bold text-black! mb-1">Reminders</h1>
          <p className="text-black!">
            Manage all your reminder records efficiently
          </p>
        </div>

        {/* STATS CARDS - Simple Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
          {/* Card 1 - Light Green */}
          <div className="bg-green-100 dark:bg-green-800/50 rounded-lg border border-green-200 dark:border-green-700 p-5">
            <p className="text-sm text-green-600 dark:text-green-500 mb-1">
              Total Reminders
            </p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-green-600 dark:text-green-500 mb-1">
                {contacts.length}
              </p>
              <div className="p-2 bg-green-500 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
            </div>
          </div>

          {/* Card 2 - Light Emerald */}
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-700 p-5">
            <p className="text-sm text-green-600 dark:text-green-500 mb-1">
              This Week
            </p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold  text-green-600 dark:text-green-500 mb-1">
                5
              </p>
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </div>

          {/* Card 3 - Light Amber */}
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700 p-5">
            <p className="text-sm text-amber-600 dark:text-amber-500 mb-1">
              Upcoming
            </p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold  text-amber-600 dark:text-amber-500 mb-1">
                2
              </p>
              <div className="p-2 bg-amber-500 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* 🔍 SEARCH + FILTER */}
        <div className="flex items-center justify-between mb-6">
          {/* Search Section */}
          <div className="flex items-center gap-3 relative w-60">
            {/* Search Icon */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />

            <input
              type="text"
              placeholder="   Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "2rem" }}
              className="
                w-85
                border 
                border-gray-300 
                dark:border-gray-600
                dark:bg-gray-800
                dark:text-gray-200
                rounded-lg 
                py-2
                outline-none
                text-gray-700 
                placeholder-gray-400
                dark:placeholder-gray-500
              "
            />
          </div>

          {/* RIGHT-SIDE BUTTONS (FILTERS + CREATE) */}
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white-100 dark:bg-gray-800 hover:bg-blue-500 dark:hover:bg-gray-700 
              text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm border border-gray-200 dark:border-gray-700"
            >
              <Filter size={16} />
              Filters
            </button>

            <button
              onClick={() => router.push("/user/reminder/create")}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 
              text-white rounded-lg transition-colors text-sm"
            >
              <Plus size={16} />
              Create Reminder
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Reminder Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm">
                            {contact.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {contact.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar
                            size={14}
                            className="text-gray-400 dark:text-gray-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {contact.date}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock
                            size={14}
                            className="text-gray-400 dark:text-gray-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {contact.time}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {contact.reminderName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(contact.id)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(contact.id)}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-500 dark:hover:bg-green-700/50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No contacts found. Create one to get started.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
