/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import "./campaign.css";
import "./campaign-professional.css";
import { useEffect, useState, useCallback, useMemo, MouseEvent } from "react";
import CampaignsTopbar from "@/components/campaigns-topbar";
import { EditCampaignForm } from "@/components/EditCampaignForm";
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Edit2,
  Trash2,
  BarChart3,
  ChevronDown
} from "lucide-react";
import { ngrokAxiosInstance } from "@/lib/axiosInstance";
import { toast } from "react-toastify";

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  description?: string | null;
};

type ColumnKey = string;
type SortField = "name" | "type" | "status" | "startDate" | "sentCount" | "pending";
type SortOrder = "asc" | "desc";
type SortState = { field: SortField; order: SortOrder };

const FIELD_MAP: Record<SortField, string> = {
  name: "Campaign Name",
  type: "Type",
  status: "Status",
  startDate: "Scheduled At",
  sentCount: "Sent",
  pending: "Pending",
};

const PRIMARY_INDIGO = "indigo-600";
const ACCENT_BLUE = "blue-400";
const DARK_PURPLE = "purple-900";

const COLOR = {
  primary: "text-[#2563EB]",
  primaryBg: "bg-[#2563EB]",
  softBg: "bg-[#F9FAFB]",
  pageBg: "bg-transparent",
  softBgDark: "dark:bg-[#1A1F2B]",
  pageBgDark: "dark:bg-[#000000]",
  textPrimary: "text-[#111827]",
  textPrimaryDark: "dark:text-[#F9FAFB]",
  textSecondary: "text-[#6B7280]",
  textSecondaryDark: "dark:text-[#9CA3AF]",
  border: "border-[#E5E7EB]",
  borderDark: "dark:border-[#2D3441]",
  card: "bg-white dark:bg-[#1A1F2B] border border-[#E5E7EB] dark:border-[#2D3441]",
  buttonPrimary: "bg-[#2563EB] hover:bg-[#1E4ED8] text-white transition shadow-sm",
  tableRowEven: "bg-white dark:bg-[#1A1F2B]",
  tableRowOdd: "bg-[#F9FAFB] dark:bg-[#111827]",
  tableHeader: "bg-[#F3F4F6] dark:bg-[#1F2430]",
};

const getAccentClasses = () => ({
  text: `text-${PRIMARY_INDIGO} dark:text-${ACCENT_BLUE}`,
  ring: `ring-${ACCENT_BLUE}/30`,
  focusRing: `focus:ring-${ACCENT_BLUE} focus:border-${ACCENT_BLUE}`,
  dropdownFocus: `focus:outline-none focus:ring-2 focus:ring-${ACCENT_BLUE}`,
  checkbox: `text-${PRIMARY_INDIGO} focus:ring-${ACCENT_BLUE}`,
  bgLight: COLOR.softBg + " " + COLOR.softBgDark,
  hoverBgLight: "hover:bg-gray-100 dark:hover:bg-purple-700/50",
  hoverText: `hover:text-${PRIMARY_INDIGO} dark:hover:text-${ACCENT_BLUE}`,
});

const getStatusClasses = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return `status-badge status-active bg-indigo-600/20 text-indigo-600 ring-1 ring-indigo-600/30`;
    case "scheduled":
      return `status-badge status-scheduled bg-blue-500/20 text-blue-600 ring-1 ring-blue-500/30`;
    case "paused":
      return "status-badge status-paused bg-yellow-500/20 text-yellow-600 ring-1 ring-yellow-500/30";
    case "completed":
      return "status-badge status-completed bg-green-500/20 text-green-600 ring-1 ring-green-500/30";
    default:
      return "status-badge bg-gray-200 text-gray-700 ring-1 ring-gray-300";
  }
};

const PAGE_SIZE_OPTIONS = [20, 40, 50, 60, 80, 100];

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sorts, setSorts] = useState<SortState[]>([
    { field: "startDate", order: "desc" },
  ]);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "name", "type", "status", "startDate", "sentCount", "pending",
  ]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const accent = useMemo(getAccentClasses, []);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isError, setIsError] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setIsError(false);
      const sortParams = sorts.map((s) => `${s.field}:${s.order}`).join(",");
      const offset = (page - 1) * pageSize;

      const queryParams = new URLSearchParams({
        search: search || "",
        limit: pageSize.toString(),
        offset: offset.toString(),
        sort: sortParams || "",
      });

      const res = await ngrokAxiosInstance.get(`/admin/campaigns?${queryParams.toString()}`);
      
      const resData = res.data;
      const fetchedCampaigns: Campaign[] = Array.isArray(resData?.data?.campaigns)
        ? resData.data.campaigns
        : Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : Array.isArray(resData)
        ? resData
        : [];
      
      const totalCount = resData?.data?.total ?? resData?.meta?.total ?? resData?.total ?? fetchedCampaigns.length;

      setCampaigns(fetchedCampaigns);
      setTotal(totalCount);
    } catch (err) {
      console.error("Fetch campaigns failed:", err);
      setIsError(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [search, page, sorts, pageSize]);

  // Initial fetch and on dependency change
  useEffect(() => {
    fetchCampaigns(true);
  }, [fetchCampaigns]);

  // Periodic background refresh (every 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCampaigns(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".views-dropdown")) {
        setShowColumnDropdown(false);
      }
    }
    if (showColumnDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColumnDropdown]);

  async function deleteCampaign(id: string) {
    if (!window.confirm("Delete this campaign permanently?")) return;
    try {
      await ngrokAxiosInstance.delete("/admin/campaigns", { params: { id } });
      toast.success("Campaign deleted successfully!");
      fetchCampaigns(false);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Could not delete campaign.");
    }
  }

  async function updateCampaign(updated: Partial<Campaign>) {
    if (!selected) return;
    try {
      await ngrokAxiosInstance.patch(`/user/campaigns/api`, updated, {
        params: { id: selected.id },
      });
      toast.success("Campaign updated successfully!");
      setViewMode(null);
      setSelected(null);
      fetchCampaigns(false);
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update campaign.");
    }
  }

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);
  const currentPageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const currentPageEnd = Math.min(page * pageSize, total);

  return (
    <div className="campaign-page campaigns-list-page">
      <div className={`min-h-screen px-6! py-6! md:px-8! md:py-8! p-6! rounded! ${COLOR.pageBg} text-black! dark:text-white!`}>
        {/* HEADER */}
        <header className="mb-8 flex justify-between items-center">
          <CampaignsTopbar
            onSearch={(q) => {
              setSearch(q);
              setPage(1);
            }}
          />
        </header>

        {/* CONTROLS SECTION */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            {/* LEFT SIDE - Show Rows */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl px-4 py-2 bg-[#DCFCE7] border border-[#bbf7d0]">
                <span className="text-sm font-semibold !text-[#064E3B]">Show:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="text-sm font-semibold text-[#064E3B] bg-transparent border-none outline-none cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} rows
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Start Date + Views */}
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {/* START DATE FILTER */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DCFCE7] border border-[#bbf7d0]">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-semibold !text-[#064E3B]">START DATE</span>
                <ArrowDown className="w-4 h-4 text-[#064E3B]" />
              </div>

              {/* VIEWS DROPDOWN */}
              <div className="relative views-dropdown">
                <button
                  onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                  className="flex items-center justify-between gap-2 px-4 py-1.5 rounded-xl bg-[#DCFCE7] border border-[#bbf7d0] !text-[#064E3B] font-semibold min-w-[130px]"
                >
                  Views
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showColumnDropdown && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl shadow-lg z-50 border border-[#bbf7d0] bg-[#dcfce7]">
                    <div className="p-2 flex flex-col gap-1">
                      {[
                        { field: "name", label: "Campaign" },
                        { field: "type", label: "Type" },
                        { field: "status", label: "Status" },
                        { field: "startDate", label: "Start Date" },
                        { field: "sentCount", label: "Sent" },
                        { field: "pending", label: "Pending" },
                      ].map(({ field, label }) => (
                        <label
                          key={field}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-emerald-200 transition"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(field)}
                            onChange={() =>
                              setVisibleColumns((prev) =>
                                prev.includes(field)
                                  ? prev.filter((f) => f !== field)
                                  : [...prev, field]
                              )
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-[#064E3B]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-10 text-black! dark:text-white!">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-10 text-black! dark:text-white!">No campaigns found.</div>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F172A] p-4 shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-black! dark:text-white!">{c.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-sm text-black! dark:text-white! space-y-1">
                  <div>Type: {c.type}</div>
                  <div>
                    Start:{" "}
                    {c.scheduled_at
                      ? new Date(c.scheduled_at).toLocaleString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", hour12: true,
                        })
                      : "-"}
                  </div>
                  <div className="flex gap-4">
                    <span className="text-emerald-600 font-semibold">Sent: {c.sent_count}</span>
                    <span className="text-amber-600 font-semibold">
                      Pending: {Math.max(0, c.total_recipients - c.sent_count - c.failed_count)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => { setSelected(c); setViewMode("view"); }} className="p-2 bg-green-200 hover:bg-green-300 rounded-lg">
                    <Eye className="w-4 h-4 text-green-600" />
                  </button>
                  <button onClick={() => (window.location.href = `/campaigns/${c.id}`)} className="p-2 bg-orange-200 hover:bg-orange-300 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                  </button>
                  <button onClick={() => { setSelected(c); setViewMode("edit"); }} className="p-2 bg-blue-200 hover:bg-blue-300 rounded-lg">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button onClick={() => deleteCampaign(c.id)} className="p-2 bg-red-200 hover:bg-red-300 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TABLE */}
        <div className="hidden md:block overflow-x-auto bg-white dark:bg-[#1A1F2B] rounded-xl shadow-lg border-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <thead className="uppercase text-xs bg-gray-50! dark:bg-[#3b4451]!">
                <tr>
                  <th className="px-4 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={campaigns.length > 0 && selectedCampaignIds.length === campaigns.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCampaignIds(campaigns.map((c) => c.id));
                        else setSelectedCampaignIds([]);
                      }}
                    />
                  </th>
                  {Object.entries(FIELD_MAP).map(([field, displayName]) => {
                    if (!visibleColumns.includes(field as SortField)) return null;
                    const sortState = sorts.find((s) => s.field === field);
                    const isAsc = sortState?.order === "asc";
                    return (
                      <th
                        key={field}
                        className={`px-6 py-3 font-semibold cursor-pointer select-none text-green-400! dark:text-green-400! ${accent.hoverBgLight}`}
                        onClick={(e: MouseEvent) => {
                          const shift = e.shiftKey;
                          setSorts((prev) => {
                            let newSorts = [...prev];
                            const index = newSorts.findIndex((s) => s.field === field);
                            if (index >= 0) {
                              if (newSorts[index].order === "asc") newSorts[index].order = "desc";
                              else newSorts.splice(index, 1);
                            } else {
                              if (!shift) newSorts = [];
                              newSorts.push({ field: field as SortField, order: "asc" });
                            }
                            return newSorts;
                          });
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {displayName}
                          {sortState && (isAsc
                            ? <ArrowUp className={`w-3 h-3 ${accent.text}`} />
                            : <ArrowDown className={`w-3 h-3 ${accent.text}`} />
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-6 py-3 font-semibold cursor-pointer select-none text-green-400! dark:text-green-400!">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="loading-state text-center py-12 text-black! dark:text-white!">
                      Loading campaigns...
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="empty-state text-center py-12 text-black! dark:text-white!">
                      No campaigns found.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c, i) => (
                    <tr
                      key={c.id}
                      className="bg-white dark:bg-[#0F172A] transition hover:bg-[#DCFCE7] dark:hover:bg-[#1E293B]"
                    >
                      <td className="px-4 py-4 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedCampaignIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCampaignIds((prev) => [...prev, c.id]);
                            else setSelectedCampaignIds((prev) => prev.filter((id) => id !== c.id));
                          }}
                        />
                      </td>
                      {visibleColumns.includes("name") && (
                        <td className="px-6 py-4 font-medium text-black! dark:text-white!">{c.name}</td>
                      )}
                      {visibleColumns.includes("type") && (
                        <td className="px-6 py-4 text-black! dark:text-white!">{c.type}</td>
                      )}
                      {visibleColumns.includes("status") && (
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("startDate") && (
                        <td className="px-6 py-4 text-black! dark:text-white!">
                          {c.scheduled_at
                            ? new Date(c.scheduled_at).toLocaleString("en-US", {
                                year: "numeric", month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit", hour12: true,
                              })
                            : "-"}
                        </td>
                      )}
                      {visibleColumns.includes("sentCount") && (
                        <td className="px-6 py-4 font-semibold text-emerald-600">{c.sent_count}</td>
                      )}
                      {visibleColumns.includes("pending") && (
                        <td className="px-6 py-4 font-semibold text-amber-600">
                          {Math.max(0, c.total_recipients - c.sent_count - c.failed_count)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right flex justify-end gap-2 action-buttons">
                        <button title="View Campaign" onClick={() => { setSelected(c); setViewMode("view"); }} className="p-2.5 bg-green-200 hover:bg-green-300 rounded-xl transition-all duration-200 hover:scale-105">
                          <Eye className="w-4 h-4 text-green-500" />
                        </button>
                        <button onClick={() => (window.location.href = `/campaigns/${c.id}`)} className="p-2.5 bg-orange-200 hover:bg-orange-300 rounded-xl transition-all duration-200 hover:scale-105" title="View Stats">
                          <BarChart3 className="w-4 h-4 text-orange-500" />
                        </button>
                        <button title="Edit Campaign" onClick={() => { setSelected(c); setViewMode("edit"); }} className="p-2.5 bg-blue-200 hover:bg-blue-300 rounded-xl transition-all duration-200 hover:scale-105">
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button title="Delete Campaign" onClick={() => deleteCampaign(c.id)} className="p-2.5 bg-red-200 hover:bg-red-300 rounded-xl transition-all duration-200 hover:scale-105">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="page-info text-sm font-medium text-black! dark:text-white!">
              Showing <strong>{currentPageStart}</strong>–<strong>{currentPageEnd}</strong> of <strong>{total}</strong>
            </div>
            <div className="flex gap-4 sm:justify-end">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="pagination-btn">
                <ChevronLeft className="w-4 h-4 inline mr-2" />Prev
              </button>
              <button disabled={page === totalPages || total === 0} onClick={() => setPage(page + 1)} className="pagination-btn">
                Next<ChevronRight className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* MODAL */}
        {selected && viewMode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`${COLOR.card} rounded-2xl p-8 w-full max-w-lg shadow-2xl relative`}>
              <button
                className={`${COLOR.textSecondary} ${COLOR.textSecondaryDark} hover:text-red-500 absolute top-4 right-4`}
                onClick={() => { setSelected(null); setViewMode(null); }}
              >✕</button>
              {viewMode === "view" ? (
                <div>
                  <h2 className={`text-2xl font-bold mb-6 ${accent.text}`}>Campaign Details</h2>
                  <div className="space-y-4">
                    <Detail label="Name" value={selected.name} />
                    <Detail label="Type" value={selected.type} />
                    <Detail label="Status" value={selected.status} />
                    <Detail label="Start Date" value={selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleDateString() : "-"} />
                    <Detail label="Sent Count" value={selected.sent_count.toString()} />
                    <Detail label="Pending Count" value={Math.max(0, selected.total_recipients - selected.sent_count - selected.failed_count).toString()} />
                  </div>
                </div>
              ) : (
                <EditCampaignForm
                  campaign={selected}
                  onSave={updateCampaign}
                  onCancel={() => { setSelected(null); setViewMode(null); }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-gray-200 dark:border-indigo-700 pb-3">
    <span className="text-sm font-medium text-black! dark:text-white!">{label}:</span>
    <span className="text-sm font-semibold text-black! dark:text-white!">{value}</span>
  </div>
);
