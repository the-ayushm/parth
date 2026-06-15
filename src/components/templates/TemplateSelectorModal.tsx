/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useRef } from "react";
import { X, Search, FileText, Send, Upload } from "lucide-react";
import FormattedText from "./FormattedText";
import { getTemplateVariables, TemplateVariable } from "@/lib/template-utils";
type UserStatus = "ACTIVE" | "INACTIVE" | "REJECTED";
import { ngrokAxiosInstance } from "@/lib/axiosInstance";
interface Template {
  id: number | string;
  name: string;
  category: string;
  language: string;
  status: string;
  components: any[];
  headerMode?: "fixed" | "dynamic" | null;
}

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactPhone: string;
  contactName?: string;
  phoneNumberId: string;
  onSend: (
    templateId: number | string,
    variables: Record<string, string>,
    templateData?: any,
  ) => Promise<void>;
}

type HeaderMediaType = "IMAGE" | "VIDEO" | "DOCUMENT";

function isFormValid(
  template: Template | null,
  variables: Record<string, string>,
): boolean {
  if (!template) return false;
  // All text variables must be filled
  const templateVars = getTemplateVariables(template.components || []);
  for (const v of templateVars) {
    const val = variables[v.name]?.trim();
    if (!val) return false;
  }
  // Media headers: fixed = no input needed; dynamic = user MUST provide URL or upload
  const headerComp = template.components?.find(
    (c) => c.type === "HEADER" && c.format !== "TEXT",
  );
  if (headerComp) {
    const headerMode = template.headerMode;
    if (headerMode === "fixed") return true; // Fixed header: Meta uses approved example
    const format = (headerComp.format || "").toUpperCase();
    if (format === "IMAGE" && !variables["headerImageUrl"]?.trim()) return false;
    if (format === "VIDEO" && !variables["headerVideoUrl"]?.trim()) return false;
    if (format === "DOCUMENT" && !variables["headerDocumentUrl"]?.trim())
      return false;
  }
  return true;
}

function mapMetaStatusToEnum(status: string): UserStatus {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return "ACTIVE"; // Map Meta APPROVED to your enum ACTIVE
    case "REJECTED":
      return "REJECTED";
    case "ARCHIVED":
    case "DELETED":
      return "INACTIVE";
    default:
      return "INACTIVE"; // fallback
  }
}
export function TemplateSelectorModal({
  isOpen,
  onClose,
  contactPhone,
  contactName,
  phoneNumberId,
  onSend,
}: TemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [templateVars, setTemplateVars] = useState<TemplateVariable[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState<string | null>(null);
  const [headerPreviewUrls, setHeaderPreviewUrls] = useState<
    Record<HeaderMediaType, string>
  >({
    IMAGE: "",
    VIDEO: "",
    DOCUMENT: "",
  });
  const blobPreviewRef = useRef<Record<HeaderMediaType, string>>({
    IMAGE: "",
    VIDEO: "",
    DOCUMENT: "",
  });
  const headerImageFileRef = useRef<HTMLInputElement>(null);
  const headerVideoFileRef = useRef<HTMLInputElement>(null);
  const headerDocumentFileRef = useRef<HTMLInputElement>(null);

  const resolveHeaderPreviewUrl = (value?: string): string | null => {
    const trimmed = (value || "").trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("wa_template_media_preview_map");
        const map = raw ? JSON.parse(raw) : {};
        const cached = map[trimmed];
        if (typeof cached === "string" && cached.trim()) {
          return cached;
        }
      } catch {
        return null;
      }
    }

    return null;
  };

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const consoleToken =
        typeof window !== "undefined"
          ? localStorage.getItem("console_access_token")
          : null;

      const res = await ngrokAxiosInstance.get("/admin/templates?status=APPROVED");
      const payload = res.data;

      const rawTemplates = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      const mappedTemplates = rawTemplates.map((template: any) => ({
        id: template.id || template.template_id,
        name: template.name,
        category: template.category || "UNCATEGORIZED",
        language: template.language || "en",
        status: template.status || "APPROVED",
        components: Array.isArray(template.components) ? template.components : [],
        headerMode: template.headerMode || null,
      }));

      setTemplates(mappedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    (Object.keys(blobPreviewRef.current) as HeaderMediaType[]).forEach((key) => {
      const blobUrl = blobPreviewRef.current[key];
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobPreviewRef.current[key] = "";
      }
    });
    setHeaderPreviewUrls({ IMAGE: "", VIDEO: "", DOCUMENT: "" });

    setSelectedTemplate(template);
    const vars = getTemplateVariables(template.components || []);
    setTemplateVars(vars);

    const initialVars: Record<string, string> = {};

    const headerComponent = template.components?.find(
      (c) => c.type === "HEADER" && c.format !== "TEXT",
    );
    if (headerComponent && template.headerMode !== "fixed") {
      // Dynamic header: user must provide URL or upload (header_handle from creation is invalid)
      const format = (headerComponent.format || "").toUpperCase();
      if (format === "IMAGE") initialVars["headerImageUrl"] = "";
      else if (format === "VIDEO") initialVars["headerVideoUrl"] = "";
      else if (format === "DOCUMENT") {
        initialVars["headerDocumentUrl"] = "";
        initialVars["headerDocumentFilename"] = "";
      }
    }

    vars.forEach((v) => {
      // Smart pre-fill: if variable is '1' or 'name', pre-fill with contact name
      if ((v.name === "1" || v.name.toLowerCase() === "name") && contactName) {
        initialVars[v.name] = contactName;
      } else {
        initialVars[v.name] = "";
      }
    });
    setVariables(initialVars);
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    setSending(true);
    try {
      await onSend(selectedTemplate.id, variables, selectedTemplate);
      onClose();
      setSelectedTemplate(null);
      setVariables({});
    } catch (error) {
      console.error("Error sending template:", error);
    } finally {
      setSending(false);
    }
  };

  const handleHeaderFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    headerType: "IMAGE" | "VIDEO" | "DOCUMENT",
    varKey: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeader(headerType);

    const objectUrl = URL.createObjectURL(file);
    if (blobPreviewRef.current[headerType]) {
      URL.revokeObjectURL(blobPreviewRef.current[headerType]);
    }
    blobPreviewRef.current[headerType] = objectUrl;
    setHeaderPreviewUrls((prev) => ({ ...prev, [headerType]: objectUrl }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await ngrokAxiosInstance.post("/admin/campaigns/upload-media", formData);

      const data = res.data;

      if (!data?.success) {
        throw new Error(data?.message || data?.error || "Upload failed");
      }

      const mediaId =
        data?.data?.media_id || data?.url || data?.mediaUrl || data?.id;

      let localPreviewUrl: string | null = null;
      try {
        const cacheForm = new FormData();
        cacheForm.append("file", file);
        const cacheRes = await fetch("/api/user/whatsapp/cache-media", {
          method: "POST",
          body: cacheForm,
        });
        const cacheData = await cacheRes.json();
        if (cacheRes.ok && cacheData?.url) {
          localPreviewUrl = cacheData.url;
        }
      } catch (cacheError) {
        console.error("Template media local cache failed:", cacheError);
      }

      if (localPreviewUrl) {
        setHeaderPreviewUrls((prev) => ({ ...prev, [headerType]: localPreviewUrl }));
      }

      if (mediaId) {
        if (typeof window !== "undefined" && localPreviewUrl) {
          const raw = localStorage.getItem("wa_template_media_preview_map");
          const map = raw ? JSON.parse(raw) : {};
          map[String(mediaId)] = localPreviewUrl;
          localStorage.setItem("wa_template_media_preview_map", JSON.stringify(map));
        }
        setVariables((v) => ({ ...v, [varKey]: mediaId }));
      } else {
        throw new Error("API did not return a media ID");
      }
    } catch (err: any) {
      console.error("Header upload error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed";
      alert(msg);
    } finally {
      setUploadingHeader(null);
      e.target.value = "";
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Send WhatsApp template
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Choose an approved template and review the message before
                sending.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-1/2 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-800">
            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                />
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loading ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-300 text-sm">
                  Loading templates...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-300 text-sm">
                  No approved templates found
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer border text-sm transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "bg-teal-50 dark:bg-teal-900/30 border-teal-400/70 dark:border-teal-500 text-teal-900 dark:text-teal-100"
                        : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                      {template.category} • {template.language}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview & Variables */}
          <div className="w-1/2 flex flex-col bg-white dark:bg-slate-800 min-h-0">
            {/* Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Preview
              </h3>
              {selectedTemplate ? 
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300 transition-opacity duration-200">
                    Sent to{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-100">
                      {contactPhone}
                    </span>{" "}
                    using{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-100">
                      {selectedTemplate.name}
                    </span>
                  </p>

                  <div className="max-w-md mx-auto">
                    <div className="rounded-2xl border border-teal-100 dark:border-teal-700 bg-white dark:bg-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-200">
                      <div className="px-4 py-3 border-b border-teal-50 dark:border-teal-900/40 bg-teal-50/80 dark:bg-teal-900/20 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {selectedTemplate.name}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            {selectedTemplate.category} •{" "}
                            {selectedTemplate.language}
                          </p>
                        </div>
                        <span className="text-[11px] text-teal-700 dark:text-teal-300">
                          Template
                        </span>
                      </div>

                      <div className="space-y-3">
                        {selectedTemplate.components?.map((component, idx) => {
                          // HEADER with IMAGE, VIDEO, or DOCUMENT
                          if (
                            component.type === "HEADER" &&
                            component.format !== "TEXT"
                          ) {
                            const format = (component.format || "").toUpperCase();
                            const mediaUrl =
                              format === "IMAGE"
                                ? headerPreviewUrls.IMAGE ||
                                  resolveHeaderPreviewUrl(variables["headerImageUrl"]) ||
                                  component.example?.header_handle?.[0]
                                : format === "VIDEO"
                                  ? headerPreviewUrls.VIDEO ||
                                    resolveHeaderPreviewUrl(variables["headerVideoUrl"]) ||
                                    component.example?.header_handle?.[0]
                                  : format === "DOCUMENT"
                                    ? headerPreviewUrls.DOCUMENT ||
                                      resolveHeaderPreviewUrl(variables["headerDocumentUrl"]) ||
                                      component.example?.header_handle?.[0]
                                    : component.example?.header_handle?.[0];
                            if (component.format === "IMAGE" && mediaUrl) {
                              return (
                                <div key={idx} className="w-full">
                                  <img
                                    src={mediaUrl}
                                    alt="Template header"
                                    className="w-full h-auto object-cover max-h-64"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const fallback =
                                        target.nextElementSibling as HTMLElement;
                                      if (fallback)
                                        fallback.style.display = "flex";
                                    }}
                                  />
                                  <div className="hidden w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-b-lg items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                                    <div className="text-center">
                                      <svg
                                        className="w-8 h-8 mx-auto mb-1"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Image not available
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            if (component.format === "VIDEO" && mediaUrl) {
                              return (
                                <div
                                  key={idx}
                                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-b-lg h-32 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs"
                                >
                                  <div className="text-center">
                                    <svg
                                      className="w-8 h-8 mx-auto mb-1"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                    Video
                                  </div>
                                </div>
                              );
                            }
                            if (component.format === "DOCUMENT" && mediaUrl) {
                              return (
                                <div
                                  key={idx}
                                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-b-lg h-32 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs"
                                >
                                  <div className="text-center">
                                    <svg
                                      className="w-8 h-8 mx-auto mb-1"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Document
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }
                          // HEADER with TEXT
                          if (
                            component.type === "HEADER" &&
                            component.format === "TEXT"
                          ) {
                            return (
                              <div
                                key={idx}
                                className="px-4 pt-3 font-semibold text-slate-900 dark:text-white"
                              >
                                {component.text}
                              </div>
                            );
                          }
                          if (component.type === "BODY") {
                            return (
                              <div
                                key={idx}
                                className="px-4 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line"
                              >
                                <FormattedText text={component.text} />
                              </div>
                            );
                          }
                          if (component.type === "FOOTER") {
                            return (
                              <div
                                key={idx}
                                className="px-4 pb-3 pt-1 text-[11px] text-slate-500 dark:text-slate-300"
                              >
                                {component.text}
                              </div>
                            );
                          }
                          if (component.type === "BUTTONS") {
                            return (
                              <div
                                key={idx}
                                className="px-4 pb-3 mt-2 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2"
                              >
                                {component.buttons?.map(
                                  (btn: any, bidx: number) => (
                                    <button
                                      key={bidx}
                                      type="button"
                                      className="w-full text-sm font-medium text-emerald-700 dark:text-emerald-300 py-2 border border-emerald-100 dark:border-emerald-800 rounded-lg bg-emerald-50/70 dark:bg-emerald-900/30"
                                    >
                                      {btn.text}
                                    </button>
                                  ),
                                )}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Variables */}
                  {(templateVars.length > 0 ||
                    selectedTemplate.components?.some(
                      (c) =>
                        c.type === "HEADER" &&
                        ["IMAGE", "VIDEO", "DOCUMENT"].includes(
                          (c.format || "").toUpperCase(),
                        ),
                    )) && (
                    <div className="mt-6 px-4 pb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
                        Fill variables
                      </h3>
                      {selectedTemplate.components?.some(
                        (c) =>
                          c.type === "HEADER" &&
                          ["IMAGE", "VIDEO", "DOCUMENT"].includes(
                            (c.format || "").toUpperCase(),
                          ),
                      ) &&
                        selectedTemplate.headerMode === "dynamic" && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded">
                          Dynamic header: Provide a public HTTPS URL or upload a file for each send.
                        </p>
                      )}
                      <div className="space-y-3">
                        {selectedTemplate.components?.some(
                          (c) =>
                            c.type === "HEADER" &&
                            (c.format || "").toUpperCase() === "IMAGE",
                        ) &&
                          selectedTemplate.headerMode !== "fixed" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Header Image (URL or upload)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={variables["headerImageUrl"] || ""}
                                onChange={(e) =>
                                  setVariables({
                                    ...variables,
                                    headerImageUrl: e.target.value,
                                  })
                                }
                                className="flex-1 px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50/30 dark:bg-slate-900 text-sm"
                                placeholder="https://example.com/image.jpg"
                              />
                              <input
                                ref={headerImageFileRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                className="hidden"
                                onChange={(e) =>
                                  handleHeaderFileUpload(
                                    e,
                                    "IMAGE",
                                    "headerImageUrl"
                                  )
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  headerImageFileRef.current?.click()
                                }
                                disabled={uploadingHeader === "IMAGE"}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {uploadingHeader === "IMAGE" ? (
                                  <>...</>
                                ) : (
                                  <>
                                    <Upload size={14} />
                                    Upload
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTemplate.components?.some(
                          (c) =>
                            c.type === "HEADER" &&
                            (c.format || "").toUpperCase() === "VIDEO",
                        ) &&
                          selectedTemplate.headerMode !== "fixed" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Header Video (URL or upload)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={variables["headerVideoUrl"] || ""}
                                onChange={(e) =>
                                  setVariables({
                                    ...variables,
                                    headerVideoUrl: e.target.value,
                                  })
                                }
                                className="flex-1 px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50/30 dark:bg-slate-900 text-sm"
                                placeholder="https://example.com/video.mp4"
                              />
                              <input
                                ref={headerVideoFileRef}
                                type="file"
                                accept="video/mp4,video/3gpp"
                                className="hidden"
                                onChange={(e) =>
                                  handleHeaderFileUpload(
                                    e,
                                    "VIDEO",
                                    "headerVideoUrl"
                                  )
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  headerVideoFileRef.current?.click()
                                }
                                disabled={uploadingHeader === "VIDEO"}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {uploadingHeader === "VIDEO" ? (
                                  <>...</>
                                ) : (
                                  <>
                                    <Upload size={14} />
                                    Upload
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTemplate.components?.some(
                          (c) =>
                            c.type === "HEADER" &&
                            (c.format || "").toUpperCase() === "DOCUMENT",
                        ) &&
                          selectedTemplate.headerMode !== "fixed" && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Header Document (URL or upload)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={variables["headerDocumentUrl"] || ""}
                                  onChange={(e) =>
                                    setVariables({
                                      ...variables,
                                      headerDocumentUrl: e.target.value,
                                    })
                                  }
                                  className="flex-1 px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50/30 dark:bg-slate-900 text-sm"
                                  placeholder="https://example.com/document.pdf"
                                />
                                <input
                                  ref={headerDocumentFileRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleHeaderFileUpload(
                                      e,
                                      "DOCUMENT",
                                      "headerDocumentUrl"
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    headerDocumentFileRef.current?.click()
                                  }
                                  disabled={uploadingHeader === "DOCUMENT"}
                                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {uploadingHeader === "DOCUMENT" ? (
                                    <>...</>
                                  ) : (
                                    <>
                                      <Upload size={14} />
                                      Upload
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Document filename (optional)
                              </label>
                              <input
                                type="text"
                                value={
                                  variables["headerDocumentFilename"] || ""
                                }
                                onChange={(e) =>
                                  setVariables({
                                    ...variables,
                                    headerDocumentFilename: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                                placeholder="document.pdf"
                              />
                            </div>
                          </>
                        )}
                        {templateVars.map((variable) => (
                          <div key={`${variable.component}:${variable.name}`}>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              {variable.component === "HEADER"
                                ? "Header Variable"
                                : "Variable"}{" "}
                              {"{{"}
                              {variable.name}
                              {"}}"}
                            </label>
                            <input
                              type="text"
                              value={variables[variable.name] || ""}
                              onChange={(e) =>
                                setVariables({
                                  ...variables,
                                  [variable.name]: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
                              placeholder={`Enter value for {{${variable.name}}}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              : (
                <div className="max-w-md mx-auto">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 shadow-sm overflow-hidden min-h-70 flex items-center justify-center">
                    <p className="text-sm text-slate-500 dark:text-slate-200">
                      Select a template to preview
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Send Button - Always visible, fixed at bottom */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
              <button
                onClick={handleSend}
                disabled={
                  !selectedTemplate ||
                  sending ||
                  !isFormValid(selectedTemplate, variables)
                }
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Send Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
