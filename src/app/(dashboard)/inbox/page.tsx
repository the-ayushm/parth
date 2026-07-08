/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import { ReminderContent } from "@/components/reminders/ReminderContent";
import FAQFlow from "@/components/FAQFlow";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { TemplateSelectorModal } from "@/components/templates/TemplateSelectorModal";
import { TemplateMessage } from "@/components/TemplateMessage";
import { GalleryPickerModal } from "@/components/GalleryPickerModal";
import "./inbox.css";
import { Search } from "lucide-react";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Mic,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Users,
  CalendarDays,
  Layers,
  Tag,
  Bell,
  FileText,
  AlertCircle,
  Image,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatTemplateParameters,
  getTemplateVariables,
} from "@/lib/template-utils";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useSocket } from "@/hooks/useSocket";
import api from "@/lib/api";

/* ---------- Types ---------- */
interface Contact {
  id: number;
  dbId?: string;
  name: string;
  phone?: string | null;
  initials?: string;
  lastMessagePreview?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  /** When the customer last sent a message; used for 24h service window. */
  lastInboundAt?: string | null;
  direction?: string;
  lastMessageStatus?: string;
  tags?: string[];
  assigned_to?: string | null;
  show_details?: boolean | null;
  can_chat?: boolean | null;
}

interface Message {
  id: number;
  contactId: number;
  text: string;
  sentBy?: string;
  direction?: string;
  status?: string;
  senderId?: string;
  receiverId?: string;
  seen?: boolean;
  createdAt: string;
  from?: string;
  type?: string;
  buttons?: string[];
  isTemplate?: boolean;
  templateComponents?: any;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateContent?: any;
  error?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  messageType?: string | null;
  whatsappMessageId?: string | null;
}

const getMessageStableKey = (msg: Partial<Message> & Record<string, any>) => {
  const key = msg.whatsappMessageId || msg.id;
  return key != null ? String(key) : null;
};

/** Parse legacy messages stored as raw JSON (chatbot button payload bug) */
function getButtonMessageContent(msg: Message): { text: string; buttons: string[] } | null {
  if (msg.type === "button" && Array.isArray(msg.buttons)) {
    return { text: msg.text || "", buttons: msg.buttons };
  }
  if (msg.text?.startsWith?.('{"type":"button"')) {
    try {
      const p = JSON.parse(msg.text);
      if (p.type === "button" && Array.isArray(p.buttons)) {
        return { text: p.text ?? "", buttons: p.buttons };
      }
    } catch { /* ignore */ }
  }
  return null;
}

interface ContactItemProps {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
  reminders?: any[];
}

interface MessageFormInputs {
  message: string;
}

const PRIMARY_COLOR = "bg-blue-600";
const PRIMARY_TEXT = "text-blue-600";
const PRIMARY_HOVER = "hover:bg-blue-700";
const DEBUG_INBOX = process.env.NEXT_PUBLIC_DEBUG_INBOX === "true";
const CONTACTS_PAGE_LIMIT = 20;

const buildInitials = (name?: string) => {
  if (!name) return "NA";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const iconJumpAnimation = `cursor-pointer text-gray-600 dark:text-gray-300`;

const isMyMessage = (msg: Message): boolean => {
  return (
    msg.direction === "outgoing" ||
    msg.sentBy === "me" ||
    msg.sentBy === "campaign" ||
    msg.senderId === "me" ||
    msg.from === "me"
  );
};

// Format preview text for media messages
const formatPreviewText = (text: string): string => {
  if (!text) return text;

  // Replace media type placeholders with emoji indicators
  const mediaFormats: Record<string, string> = {
    "[IMAGE]": "📷 Photo",
    "[VIDEO]": "🎬 Video",
    "[AUDIO]": "🎵 Voice message",
    "[DOCUMENT]": "📄 Document",
    "[STICKER]": "🎭 Sticker",
    "Sent a image": "📷 Photo",
    "Sent a video": "🎬 Video",
    "Sent a audio": "🎵 Voice message",
    "Sent a document": "📄 Document",
    "Sent a sticker": "🎭 Sticker",
  };

  for (const [pattern, replacement] of Object.entries(mediaFormats)) {
    if (text.includes(pattern) || text === pattern) {
      return text.replace(pattern, replacement);
    }
  }

  return text;
};

const extractMessageText = (message: any): string => {
  if (!message) return "";

  const directInteractive =
    message?.interactive ||
    message?.content?.interactive ||
    message?.message_data?.interactive;
  if (directInteractive) {
    const title =
      directInteractive.button_reply?.title ||
      directInteractive.list_reply?.title ||
      directInteractive.nfm_reply?.body ||
      "Interactive Response";
    if (title) return title;
  }

  const candidates = [
    message?.text,
    message?.body,
    message?.message,
    message?.content,
    message?.caption,
    message?.data,
    message?.payload,
    message?.message_data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const value = candidate.trim();
      if (!value) continue;

      if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
        try {
          const parsed = JSON.parse(value);
          const parsedText =
            parsed?.text?.body ||
            parsed?.text?.text ||
            parsed?.body ||
            parsed?.message?.body ||
            parsed?.message ||
            parsed?.content ||
            parsed?.caption;
          if (typeof parsedText === "string" && parsedText.trim()) {
            return parsedText.trim();
          }

          const parsedInteractive = parsed?.interactive || parsed?.content?.interactive;
          if (parsedInteractive) {
            const title =
              parsedInteractive.button_reply?.title ||
              parsedInteractive.list_reply?.title ||
              parsedInteractive.nfm_reply?.body ||
              "Interactive Response";
            if (title) return title;
          }
        } catch {
          return value;
        }
      }

      return value;
    }

    if (typeof candidate === "object") {
      if (candidate?.template?.name) {
        return `Template: ${candidate.template.name}`;
      }

      const interactive = candidate?.interactive;
      if (interactive) {
        const title =
          interactive.button_reply?.title ||
          interactive.list_reply?.title ||
          interactive.nfm_reply?.body ||
          "Interactive Response";
        if (title) return title;
      }

      const nested =
        candidate?.text?.body ||
        candidate?.text?.text ||
        candidate?.body ||
        candidate?.message?.body ||
        candidate?.message ||
        candidate?.content ||
        candidate?.caption;

      if (typeof nested === "string" && nested.trim()) {
        return nested.trim();
      }
    }
  }

  return "";
};

const normalizeTemplateComponents = (components: any): any[] => {
  if (!Array.isArray(components)) return [];

  return components
    .map((component: any) => {
      const type = String(component?.type || "").toUpperCase();

      return {
        ...component,
        type,
        text: component?.text,
      };
    })
    .filter((component: any) => !!component.type);
};

const normalizePhone = (value: unknown): string =>
  String(value ?? "").replace(/\D/g, "");

const getConsoleToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const candidateKeys = [
    "console_access_token",
    "access_token",
    "token",
    "auth_token",
  ];

  for (const key of candidateKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        const nested =
          parsed?.token ||
          parsed?.access_token ||
          parsed?.accessToken ||
          parsed?.data?.token ||
          parsed?.data?.access_token;
        if (typeof nested === "string" && nested.trim()) {
          return nested.trim().replace(/^Bearer\s+/i, "");
        }
      } catch {
        // Ignore invalid JSON and continue with raw parsing
      }
    }

    return trimmed
      .replace(/^"|"$/g, "")
      .replace(/^Bearer\s+/i, "")
      .trim();
  }

  return null;
};

const removePlusPrefix = (value: unknown): string =>
  String(value ?? "").trim().replace(/^\+/, "");

const isSamePhoneValue = (left: unknown, right: unknown): boolean => {
  const leftDigits = normalizePhone(left);
  const rightDigits = normalizePhone(right);
  if (!leftDigits || !rightDigits) return false;
  return (
    leftDigits === rightDigits ||
    leftDigits.slice(-10) === rightDigits.slice(-10)
  );
};

const normalizeLeadNumber = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  const digits = normalizePhone(raw);
  if (!digits) return "";
  return raw.startsWith("+") ? `+${digits}` : `+${digits}`;
};

const getLast10Digits = (value: unknown): string => normalizePhone(value).slice(-10);

const createStableContactId = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 100000;
};

const mapContactsForSidebar = (items: any[], idSeed: string): Contact[] => {
  const latestByPhone = new Map<string, any>();

  for (const item of items) {
    let rawPhone = item?.phone_number || item?.phone || item?.leadNumber || item?.lead_number || item?.contact_number;
    if (!rawPhone) {
      if (item?.direction === "inbound") {
        rawPhone = item?.from_phone || item?.from || item?.sender;
      } else if (item?.direction === "outbound") {
        rawPhone = item?.to_phone || item?.to || item?.recipient;
      } else {
        // Fallback if direction is unknown
        const toPh = String(item?.to_phone || item?.to || "").replace(/\D/g, "");
        const seedDigits = String(idSeed || "").replace(/\D/g, "");
        if (seedDigits && toPh.endsWith(seedDigits.slice(-10))) {
          rawPhone = item?.from_phone || item?.from;
        } else {
          rawPhone = item?.to_phone || item?.to || item?.from_phone || item?.from;
        }
      }
    }

    const leadPhone = normalizeLeadNumber(rawPhone);
    if (!leadPhone) continue;

    const current = latestByPhone.get(leadPhone);
    const incomingTime = new Date(
      item?.updated_at || item?.created_at || item?.updatedAt || item?.createdAt || 0,
    ).getTime();
    const currentTime = new Date(
      current?.updated_at || current?.created_at || current?.updatedAt || current?.createdAt || 0,
    ).getTime();

    if (!current || incomingTime >= currentTime) {
      latestByPhone.set(leadPhone, item);
    }
  }

  return Array.from(latestByPhone.entries()).map(([leadPhone, item], index) => {
    const displayLeadPhone = removePlusPrefix(leadPhone);
    const fallbackName =
      item?.contact_name ||
      item?.contactName ||
      item?.name ||
      displayLeadPhone;
    const displayName = isSamePhoneValue(fallbackName, displayLeadPhone)
      ? displayLeadPhone
      : String(fallbackName || displayLeadPhone);

    const result = {
      id: createStableContactId(`${idSeed}-${leadPhone || "unknown"}-${index}`),
      dbId: item?.id ? String(item.id) : undefined,
      name: displayName,
      phone: displayLeadPhone || null,
      initials: buildInitials(displayName),
      lastMessagePreview:
        item?.lastMessageContent ||
        item?.last_message_content ||
        item?.lastMessagePreview ||
        null,
      lastMessageTime:
        item?.updated_at ||
        item?.created_at ||
        item?.updatedAt ||
        item?.createdAt ||
        null,
      unreadCount:
        item?.unreadCount ||
        item?.unread_count ||
        0,
      // include tags if present on the raw contact/conversation item
      tags: Array.isArray(item?.tags)
        ? item.tags.map((t: any) => String(t?.id ?? t))
        : Array.isArray(item?.tag_ids)
          ? item.tag_ids.map(String)
          : [],
      lastInboundAt: item?.lastInboundAt || item?.last_inbound_at || null,
      direction: item?.direction || item?.lastMessageDirection,
      lastMessageStatus: item?.lastMessageStatus || item?.last_message_status || item?.status,
      show_details: item?.show_details ?? null,
      can_chat: item?.can_chat ?? null,
    };
    console.log("DEBUG mapContactsForSidebar:", { name: result.name, idSeed, originalId: item?.id, dbId: result.dbId });
    return result;
  });
};

const getMessagePhoneCandidates = (message: any): string[] => {
  const rawValues = [
    message?.to,
    message?.from,
    message?.phone,
    message?.phone_number,
    message?.to_phone,
    message?.from_phone,
    message?.recipient,
    message?.recipient_phone,
    message?.sender,
    message?.sender_phone,
    message?.contactPhone,
    message?.wa_id,
    message?.waId,
    message?.contact?.phone,
    message?.contact?.phone_number,
    message?.meta?.to,
    message?.meta?.from,
    message?.key?.remoteJid,
  ];

  return rawValues
    .map(normalizePhone)
    .filter((p) => p.length > 0);
};

const belongsToSelectedContact = (message: any, selectedPhone?: string | null): boolean => {
  const target = normalizePhone(selectedPhone);
  if (!target) return true;

  const targetLast10 = target.slice(-10);
  const candidates = getMessagePhoneCandidates(message);

  if (candidates.length === 0) return true;

  return candidates.some((candidate) => {
    const candidateLast10 = candidate.slice(-10);
    return (
      candidate === target ||
      candidateLast10 === targetLast10 ||
      candidate.endsWith(targetLast10) ||
      target.endsWith(candidateLast10)
    );
  });
};

const isReminderActive = (reminder: any) => {
  if (!reminder.startDate) return false;

  // Build reminder datetime
  const reminderDate = new Date(reminder.startDate);

  if (reminder.startTime) {
    const [hours, minutes] = reminder.startTime.split(":").map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);
  } else {
    // If no time provided, assume end of day
    reminderDate.setHours(23, 59, 59, 999);
  }

  // Compare with now
  return reminderDate.getTime() > Date.now();
};

/** Get date group label for chat (Today, Yesterday, or formatted date) */
const getDateGroupLabel = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msgDate = new Date(date);
  msgDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return msgDate.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

/* ---------- Component ---------- */
export default function InboxPage() {
  const queryClient = useQueryClient();
  const [activeFilter] = useState("All");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // New state variables for assignment
  const [users, setUsers] = useState<any[]>([]);
  const [isHeaderUserDropdownOpen, setIsHeaderUserDropdownOpen] = useState(false);
  const [headerUserSearchQuery, setHeaderUserSearchQuery] = useState('');
  const [pendingAssignUserId, setPendingAssignUserId] = useState<string | null | undefined>(undefined);
  const [pendingShowDetails, setPendingShowDetails] = useState<boolean>(true);
  const [pendingCanChat, setPendingCanChat] = useState<boolean>(true); const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInboxMenu, setShowInboxMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingTime, setRecordingTime] = useState(0); // in seconds
  const [activeDropdown, setActiveDropdown] = useState<
    "Unread" | "Assigned" | "Unassigned" | null
  >(null);
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<
    "assignedTo" | "phoneNumbers" | "unreadTime" | null
  >(null);
  const assignedRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const [showTimeRange, setShowTimeRange] = useState(false);
  const [activeIcon, setActiveIcon] = useState("CRM");
  const [filterPhoneNumbers, setFilterPhoneNumbers] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [windowTick, setWindowTick] = useState(0);
  const dateRef = useRef<HTMLDivElement>(null);
  const inboxMenuRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  const [showSidebar, setShowSidebar] = useState(false);

  const router = useRouter();
  const { user: authUser } = useAuthStore();
  const isAdmin = authUser?.role === 'admin' || authUser?.role === 'superadmin';

  // ⭐ FAQ Flow state
  const [showFAQFlow, setShowFAQFlow] = useState(false);
  const [selectedBotForFAQ] = useState<string | undefined>(undefined);

  // ⭐ Template Selector state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // ⭐ Gallery Picker state
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [selectedGalleryMedia, setSelectedGalleryMedia] = useState<any>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // ⭐ API Window State
  const [isWindowOpenFromAPI, setIsWindowOpenFromAPI] = useState(true);

  // ⭐ Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const CONTACTS_PER_PAGE = 10;

  // Derived permissions from contact data — instant, no extra fetch needed
  const contactPermissions = selectedContact
    ? {
      show_details: selectedContact.show_details !== false, // null/undefined = show (default true)
      can_chat: selectedContact.can_chat !== false,          // null/undefined = can chat (default true)
    }
    : null;

  const { register, watch, reset } = useForm<MessageFormInputs>({
    defaultValues: { message: "" },
  });
  const messageValue = watch("message");

  // ⭐ Socket.IO for real-time updates
  useSocket({
    onNewMessage: (newMessage) => {
      console.log("📩 Inbox: New message received", newMessage);
      if (selectedContact && newMessage.contactId === selectedContact.id) {
        queryClient.setQueryData(
          ["messages", selectedContact.id],
          (oldMessages: Message[] = []) => [...oldMessages, newMessage],
        );
      }

      // Optimistically update contacts list (unread count and latest message)
      queryClient.setQueryData(["contacts", selectedPhone], (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;

        const extractDigits = (val: any) => String(val || "").replace(/\D/g, "");
        const incomingPhones = [
          newMessage?.from,
          newMessage?.phone,
          newMessage?.phone_number,
          newMessage?.sender,
          newMessage?.from_phone,
        ].map(extractDigits).filter(Boolean);

        return oldData.map((c: any) => {
          const contactPhone = extractDigits(c.phone);
          const isMatch = (c.id === newMessage.contactId) || (
            contactPhone && incomingPhones.some(ip => ip.endsWith(contactPhone.slice(-10)) || contactPhone.endsWith(ip.slice(-10)))
          );

          if (isMatch) {
            const isCurrentlySelected = selectedContact?.id === c.id;
            const newUnread = isCurrentlySelected ? 0 : (c.unreadCount || 0) + 1;
            const newTime = newMessage.createdAt || newMessage.timestamp || new Date().toISOString();

            if (typeof window !== "undefined" && contactPhone) {
              const pk = contactPhone.slice(-10);
              localStorage.setItem(`wa_unread_${pk}`, newUnread.toString());
              localStorage.setItem(`wa_lastmsgtime_${pk}`, newTime);
            }

            return {
              ...c,
              unreadCount: newUnread,
              lastMessageTime: newTime,
              lastMessagePreview: newMessage.text || newMessage.body || newMessage?.content?.text || c.lastMessagePreview
            };
          }
          return c;
        });
      });

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onMessageStatusUpdate: ({ wamid, status }) => {
      console.log("📊 Inbox: Status update received", { wamid, status, selectedContactId: selectedContact?.id });
      if (selectedContact) {
        queryClient.setQueryData(
          ["messages", selectedContact.id],
          (oldMessages: Message[] = []) => {
            const updated = oldMessages.map((msg) =>
              msg.whatsappMessageId === wamid ? { ...msg, status } : msg,
            );
            console.log("📊 Inbox: Updated messages cache, found match:",
              oldMessages.some(m => m.whatsappMessageId === wamid));
            return updated;
          }
        );
      }
      if (selectedContact) {
        queryClient.invalidateQueries({ queryKey: ["messages", selectedContact.id] });
      }
      if (selectedContact) {
        queryClient.invalidateQueries({
          queryKey: ["messages", selectedContact.id],
        });
      }
    },
  });

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact({ ...contact, unreadCount: 0 });
    setIsHeaderUserDropdownOpen(false);
    setHeaderUserSearchQuery('');

    const phoneKey = contact.phone ? getLast10Digits(contact.phone) : null;
    if (phoneKey && typeof window !== "undefined") {
      localStorage.setItem(`wa_unread_${phoneKey}`, "0");
    }

    queryClient.setQueryData(["contacts", selectedPhone], (oldData: any) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.map((c: any) =>
        c.id === contact.id ? { ...c, unreadCount: 0 } : c
      );
    });
  };

  // Fetch users list once on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/companies/user?role=user&limit=100');
      let userList = [];

      if (response) {
        if (Array.isArray(response)) {
          userList = response;
        } else if (response.data) {
          userList = response.data.data || response.data.users || response.data || [];
        } else if (response.users) {
          userList = response.users;
        }
      }
      setUsers(userList);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!selectedContact) return;
    const assignedTo = selectedContact.assigned_to;
    if (!assignedTo) return; // nothing to remove
    const targetContactId = selectedContact.dbId || String(selectedContact.id);
    const toastId = toast.loading('Removing assignment...');
    try {
      await api.delete(`/admin/contacts/${targetContactId}/removeAssignment?assigned_to=${assignedTo}`);

      // Update selectedContact
      setSelectedContact((prev) => prev ? {
        ...prev,
        assigned_to: null,
        show_details: null,
        can_chat: null,
      } : null);

      // Update contacts list cache
      queryClient.setQueryData(["contacts", selectedPhone], (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((c: any) =>
          String(c.id) === String(selectedContact.id)
            ? { ...c, assigned_to: null, show_details: null, can_chat: null }
            : c
        );
      });

      toast.update(toastId, {
        render: '✅ Assignment removed',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err: any) {
      console.error('Failed to remove assignment:', err);
      toast.update(toastId, {
        render: err.message || 'Failed to remove assignment',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleHeaderAssignContact = async (userId: string, showDetails: boolean, canChat: boolean) => {
    if (!selectedContact) return;
    const targetContactId = selectedContact.dbId || String(selectedContact.id);
    const toastId = toast.loading('Assigning contact...');
    try {
      const params = new URLSearchParams({
        assigned_to: userId,
        show_details: String(showDetails),
        can_chat: String(canChat),
      });
      await api.post(`/admin/contacts/${targetContactId}/assigned?${params.toString()}`);

      // Update selectedContact with new permissions immediately
      setSelectedContact((prev) => prev ? {
        ...prev,
        assigned_to: userId || null,
        show_details: userId ? showDetails : null,
        can_chat: userId ? canChat : null,
      } : null);

      // Update contacts list query cache with permissions
      queryClient.setQueryData(["contacts", selectedPhone], (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((c: any) =>
          String(c.id) === String(selectedContact.id)
            ? {
              ...c,
              assigned_to: userId || null,
              show_details: userId ? showDetails : null,
              can_chat: userId ? canChat : null,
            }
            : c
        );
      });

      const assignedUser = userId
        ? users.find(u => String(u.id) === String(userId))?.name || 'user'
        : null;

      toast.update(toastId, {
        render: assignedUser ? `✅ Assigned to ${assignedUser}` : '✅ Assignment removed',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err: any) {
      console.error('Failed to update assignment:', err);
      toast.update(toastId, {
        render: err.message || 'Failed to update assignment',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // Set selected phone directly (matches top selector behavior)
  const handlePhoneSelect = (phoneId: string) => {
    setSelectedPhone(phoneId);
    setShowFilterMenu(false);
  };

  const sideBarMenuIcon = [
    {
      id: "CRM",
      icon: <Users size={22} className="text-white cursor-pointer" />,
      label: "CRM",
    },
    {
      id: "Order Date",
      icon: <CalendarDays size={15} className="text-white cursor-pointer" />,
      label: "Order Date",
    },
    {
      id: "Group",
      icon: <Layers size={22} className="text-white cursor-pointer" />,
      label: "Group",
    },
    {
      id: "Tag",
      icon: <Tag size={22} className="text-white cursor-pointer" />,
      label: "Tag",
    },
    {
      id: "Schedule",
      icon: <Bell size={22} className="text-white cursor-pointer" />,
      label: "Schedule",
    },
  ];

  const [showTagMenu, setShowTagMenu] = useState(false);

  const reminders: any[] = [];

  const [selectedPhone, setSelectedPhone] = useState<string>("");

  // ✅ Fetch phone numbers from ngrok API
  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["phone-numbers"],
    queryFn: async () => {
      const response = await api.get("/admin/waba/phone-numbers");
      const data = response.data;
      if (DEBUG_INBOX) {
        console.log("Phone numbers RAW:", data);
      }

      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data?.data)
          ? data.data.data
          : Array.isArray(data?.data?.phone_numbers)
            ? data.data.phone_numbers
            : Array.isArray(data?.data?.phoneNumbers)
              ? data.data.phoneNumbers
              : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.phone_numbers)
                  ? data.phone_numbers
                  : Array.isArray(data?.results)
                    ? data.results
                    : [];

      return rawList.map((pn: any) => ({
        ...pn,
        phoneNumberId:
          pn?.id || pn?.phone_number_id || pn?.phoneNumberId || pn?.phone_number,
        displayPhone:
          pn?.display_phone_number || pn?.phone_number || pn?.number || pn?.id,
      }));
    },
  });

  useEffect(() => {
    if (!selectedPhone && phoneNumbers.length > 0) {
      setSelectedPhone(String(phoneNumbers[0]?.phoneNumberId || ""));
    }
  }, [phoneNumbers, selectedPhone]);

  const selectedPhoneMeta = React.useMemo(() => {
    return (phoneNumbers as any[]).find((pn: any) => {
      const candidates = [
        pn?.phoneNumberId,
        pn?.phone_number_id,
        pn?.phoneNumber,
        pn?.id,
        pn?.phone_number,
      ].map((v) => String(v ?? ""));

      return candidates.includes(String(selectedPhone || ""));
    });
  }, [phoneNumbers, selectedPhone]);

  // ✅ Fetch contact tags from ngrok API
  const { data: contactTags = [] } = useQuery({
    queryKey: ["contact-tags"],
    queryFn: async () => {
      // Try the contacts tags endpoint first, then fall back to /admin/tags
      let res;
      try {
        res = await api.get("/admin/contacts/tags");
      } catch (err) {
        try {
          res = await api.get("/admin/contacts/tags");
        } catch (err2) {
          console.warn('Inbox: failed to fetch contact tags from both /admin/contacts/tags and /admin/contacts/tags', err2);
          return [];
        }
      }
      const payload = res.data;
      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : Array.isArray(payload?.results)
              ? payload.results
              : [];

      return rawList.map((t: any) => ({ id: String(t?.id ?? t), name: t?.name ?? t?.label ?? t?.name ?? String(t) }));
    },
  });

  const outboundPhoneNumberId = String(
    selectedPhoneMeta?.phone_number_id ||
    selectedPhoneMeta?.phoneNumberId ||
    selectedPhoneMeta?.phone_number ||
    selectedPhoneMeta?.id ||
    selectedPhone ||
    "",
  );

  // ✅ Fetch contacts from ngrok API
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts", selectedPhone],
    queryFn: async () => {
      const token = getConsoleToken();

      if (!token) {
        throw new Error("Missing auth token for contacts fetch");
      }

      // Fetch all contacts pages
      const extractContacts = (payload: any): any[] =>
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data?.contacts)
            ? payload.data.contacts
            : Array.isArray(payload?.data?.data)
              ? payload.data.data
              : Array.isArray(payload?.contacts)
                ? payload.contacts
                : [];

      const extractPaginationInfo = (payload: any) => {
        const p =
          payload?.data?.pagination ||
          payload?.pagination ||
          payload?.meta?.pagination ||
          payload?.data?.meta?.pagination ||
          {};

        return {
          page: Number(p?.page ?? p?.current_page ?? 1) || 1,
          totalPages:
            Number(p?.total_pages ?? p?.totalPages ?? p?.last_page ?? 0) || 0,
          limit: Number(p?.limit ?? p?.per_page ?? CONTACTS_PAGE_LIMIT) || CONTACTS_PAGE_LIMIT,
        };
      };

      const allContactsRaw: any[] = [];
      const seenIds = new Set<string>();
      let page = 1;
      const maxPages = 50;

      while (page <= maxPages) {
        const contactsRes = await api.get(
          `/admin/contacts?page=${page}&limit=${CONTACTS_PAGE_LIMIT}&sortBy=created_at&sortOrder=asc`
        );

        const contactsPayload = contactsRes.data;
        const pageItems = extractContacts(contactsPayload);
        const { totalPages, limit } = extractPaginationInfo(contactsPayload);

        for (const contact of pageItems) {
          const id = String(contact?.id ?? "");
          if (!id || seenIds.has(id)) continue;
          seenIds.add(id);
          allContactsRaw.push(contact);
        }

        if (totalPages > 0) {
          if (page >= totalPages) break;
        } else {
          if (pageItems.length === 0) break;
          if (pageItems.length < Math.max(1, Math.min(limit, CONTACTS_PAGE_LIMIT))) break;
        }

        page += 1;
      }

      const mappedContacts = mapContactsForSidebar(allContactsRaw, "contacts");

      // Merge conversation metadata when available
      if (!selectedPhone) {
        return mappedContacts;
      }

      const query = new URLSearchParams({ phone_number_id: selectedPhone });
      const conversationsRes = await api.get(
        `/admin/messages/conversations?${query.toString()}`
      );

      const conversationsPayload = conversationsRes.data;
      const conversationsRaw = Array.isArray(conversationsPayload)
        ? conversationsPayload
        : Array.isArray(conversationsPayload?.data)
          ? conversationsPayload.data
          : Array.isArray(conversationsPayload?.data?.data)
            ? conversationsPayload.data.data
            : Array.isArray(conversationsPayload?.data?.conversations)
              ? conversationsPayload.data.conversations
              : Array.isArray(conversationsPayload?.conversations)
                ? conversationsPayload.conversations
                : [];

      const mappedFromConversations = mapContactsForSidebar(
        conversationsRaw,
        selectedPhone,
      );

      if (mappedFromConversations.length === 0) {
        return mappedContacts;
      }

      const conversationByPhone = new Map<string, Contact>();
      for (const item of mappedFromConversations) {
        const phoneKey = getLast10Digits(item.phone);
        if (!phoneKey) continue;
        conversationByPhone.set(phoneKey, item);
      }

      const activeContactPhone = selectedContact ? getLast10Digits(selectedContact.phone) : null;

      return mappedContacts.map((item) => {
        const phoneKey = getLast10Digits(item.phone);
        const convoMeta = phoneKey ? conversationByPhone.get(phoneKey) : undefined;

        let finalUnread = item.unreadCount || 0;
        if (convoMeta && convoMeta.unreadCount !== undefined) {
          finalUnread = convoMeta.unreadCount;
        }

        const newTime = convoMeta?.lastMessageTime || item.lastMessageTime;

        if (phoneKey && typeof window !== "undefined") {
          const lsUnreadKey = `wa_unread_${phoneKey}`;
          const lsTimeKey = `wa_lastmsgtime_${phoneKey}`;

          let storedUnread = parseInt(localStorage.getItem(lsUnreadKey) || "0", 10);
          const storedTime = localStorage.getItem(lsTimeKey) || "";

          if (newTime && storedTime && newTime !== storedTime) {
            const newMs = new Date(newTime).getTime();
            const storedMs = new Date(storedTime).getTime();

            if (newMs > storedMs) {
              const direction = convoMeta?.direction || item.direction;
              if (direction === "inbound") {
                storedUnread += 1;
              } else {
                storedUnread = 0;
              }
              localStorage.setItem(lsTimeKey, newTime);
              localStorage.setItem(lsUnreadKey, storedUnread.toString());
            }
          } else if (newTime && !storedTime) {
            const direction = convoMeta?.direction || item.direction;
            const status = convoMeta?.lastMessageStatus || item.lastMessageStatus;
            if (direction === "inbound" && status !== "read" && status !== "READ") {
              storedUnread = 1;
            } else {
              storedUnread = 0;
            }
            localStorage.setItem(lsTimeKey, newTime);
            localStorage.setItem(lsUnreadKey, storedUnread.toString());
          }

          if (phoneKey === activeContactPhone) {
            storedUnread = 0;
            localStorage.setItem(lsUnreadKey, "0");
          }

          if (storedUnread > finalUnread) {
            finalUnread = storedUnread;
          } else if (finalUnread > storedUnread) {
            localStorage.setItem(lsUnreadKey, finalUnread.toString());
          }
        }

        if (!convoMeta) {
          return {
            ...item,
            unreadCount: finalUnread
          };
        }

        return {
          ...item,
          // preserve tags from original contact item if available, otherwise use convo meta tags
          tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : (Array.isArray(convoMeta.tags) ? convoMeta.tags : []),
          lastMessagePreview: convoMeta.lastMessagePreview || item.lastMessagePreview,
          lastMessageTime: convoMeta.lastMessageTime || item.lastMessageTime,
          unreadCount: finalUnread,
          lastInboundAt: convoMeta.lastInboundAt || item.lastInboundAt,
        };
      });
    },
    enabled: true,
    refetchInterval: 5000,
  });

  /* ---------- Filter handling ---------- */
  const filteredContacts = contacts.filter((c: any) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
    const matchesFilter =
      activeFilter === "All" ||
      c.name.toLowerCase().includes(activeFilter.toLowerCase());

    // If phone-number filters are active, only include contacts belonging to selected phone numbers
    const matchesTag = !selectedTag || (Array.isArray(c.tags) ? c.tags.map(String).includes(String(selectedTag)) : false);

    return matchesSearch && matchesFilter && matchesTag;
  });

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Sort contacts by latest message time
  const sortedContacts = [...filteredContacts].sort((a: any, b: any) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedContacts.length / CONTACTS_PER_PAGE);
  const startIndex = (currentPage - 1) * CONTACTS_PER_PAGE;
  const endIndex = startIndex + CONTACTS_PER_PAGE;
  const paginatedContacts = sortedContacts.slice(startIndex, endIndex);

  // ✅ Fetch messages from ngrok API
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedContact?.id, selectedPhone, selectedContact?.phone],
    queryFn: async () => {
      if (!selectedContact) return [];
      if (!selectedPhone) return [];

      const token = getConsoleToken();
      if (!token) {
        return [];
      }

      const query = new URLSearchParams({
        phone_number_id: selectedPhone,
        leadNumber: normalizePhone(selectedContact.phone || ""),
      });

      const response = await api.get(
        `/admin/messages/lead/conversations?${query.toString()}`
      );

      const data = response.data;
      if (DEBUG_INBOX) {
        console.log("FRESH DATA FROM EXTERNAL API:", data);
      }

      let raw: any[] = [];
      if (Array.isArray(data?.data?.messages)) raw = data.data.messages;
      else if (Array.isArray(data?.messages)) raw = data.messages;
      else if (Array.isArray(data?.data?.data)) raw = data.data.data;
      else if (Array.isArray(data?.data)) raw = data.data;
      else if (Array.isArray(data)) raw = data;
      else raw = [];

      const phoneFilteredRaw = raw.filter((m: any) =>
        belongsToSelectedContact(m, selectedContact.phone),
      );

      const uniqueRaw: any[] = [];
      const seenKeys = new Set<string>();

      for (const msg of phoneFilteredRaw) {
        const key = String(
          msg?.wamid ||
          msg?.whatsappMessageId ||
          msg?.id ||
          msg?._id ||
          `${msg?.direction || ""}-${extractMessageText(msg)}-${msg?.createdAt || msg?.created_at || msg?.timestamp || ""}`,
        );

        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        uniqueRaw.push(msg);
      }

      // Map external fields → internal Message fields
      const mapped = uniqueRaw.map((m: any) => {
        const resolvedType = String(m.type || m.content?.type || "text").toLowerCase();
        const textFromContent =
          typeof m?.content === "string"
            ? m.content.trim()
            : typeof m?.content?.text === "string"
              ? m.content.text.trim()
              : "";
        const normalizedComponents = normalizeTemplateComponents(
          m.templateComponents ||
          m.content?.template?.components ||
          m.content?.components ||
          [],
        );
        const isTemplateMessage = resolvedType === "template";

        return ({
          id: m.id || m._id,
          contactId: selectedContact?.id,
          text: isTemplateMessage
            ? ""
            : (textFromContent || extractMessageText(m)),
          direction:
            m.direction === "outbound" || m.direction === "outgoing"
              ? "outgoing"
              : "incoming",
          status: m.status || "",
          createdAt: m.createdAt || m.created_at || m.timestamp || new Date().toISOString(),
          type: resolvedType,
          mediaUrl: m.mediaUrl || m.media_url || m.content?.media_url || m.content?.url || null,
          mediaType: m.mediaType || m.media_type || null,
          messageType: resolvedType || null,
          whatsappMessageId: m.wamid || m.whatsappMessageId || null,
          isTemplate: isTemplateMessage,
          templateName:
            m.templateName ||
            m.template_name ||
            m.content?.template?.name ||
            null,
          templateLanguage:
            m.templateLanguage ||
            m.template_language ||
            m.content?.template?.language?.code ||
            null,
          templateComponents: isTemplateMessage ? normalizedComponents : [],
          templateContent:
            isTemplateMessage
              ? (m.content ||
              {
                to: selectedContact?.phone || null,
                type: "template",
                template: {
                  name:
                    m.templateName ||
                    m.template_name ||
                    m.content?.template?.name ||
                    null,
                  language: {
                    code:
                      m.templateLanguage ||
                      m.template_language ||
                      m.content?.template?.language?.code ||
                      null,
                  },
                  components: normalizedComponents,
                },
                recipient_type: "individual",
                messaging_product: "whatsapp",
              })
              : null,
          error: m.error_message || m.error || null,
          errorCode: m.errorCode || m.error_code || null,
          errorMessage: m.error_message || m.errorMessage || null,
        });
      });

      const sortedMapped = [...mapped].sort(
        (a: Message, b: Message) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const recentMapped = sortedMapped.slice(-120);

      const previousMessages =
        (queryClient.getQueryData(["messages", selectedContact?.id]) as Message[] | undefined) ||
        [];

      const previousTextByKey = new Map<string, string>();
      for (const prev of previousMessages) {
        const prevKey = getMessageStableKey(prev);
        if (prevKey && prev.text?.trim()) {
          previousTextByKey.set(prevKey, prev.text);
        }
      }

      return recentMapped.map((msg: Message) => {
        if (msg.isTemplate) return msg;
        if (msg.text?.trim()) return msg;
        const key = getMessageStableKey(msg as any);
        if (!key) return msg;
        const recovered = previousTextByKey.get(key);
        if (!recovered) return msg;
        return { ...msg, text: recovered };
      });
    },
    enabled: !!selectedContact,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 2000,
    gcTime: 1000 * 60 * 5,
  });

  // ✅ Send message mutation using ngrok API
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = getConsoleToken();

      if (!token) {
        throw new Error("Unauthorized");
      }

      const hasWhatsappShape =
        payload?.messaging_product === "whatsapp" &&
        !!payload?.phone_number_id &&
        !!payload?.to &&
        !!payload?.type;

      let apiPayload: any = payload;

      if (!hasWhatsappShape) {
        const recipient =
          payload?.recipient ||
          payload?.recipient_phone ||
          payload?.to ||
          payload?.leadNumber;
        const phoneNumberId =
          payload?.phone_number_id ||
          payload?.phoneNumberId ||
          payload?.phone_number ||
          payload?.phone;
        const messageType = payload?.message_type || payload?.type || "text";
        const text =
          typeof payload?.text === "string"
            ? payload.text
            : typeof payload?.message === "string"
              ? payload.message
              : typeof payload?.content === "string"
                ? payload.content
                : "";

        const recipientDigits = String(recipient ?? "").replace(/\D/g, "");

        if (!recipientDigits || !phoneNumberId || !messageType) {
          const error: any = new Error(
            "Phone number ID, recipient, and message type are required",
          );
          error.response = {
            data: {
              message: "Phone number ID, recipient, and message type are required",
            },
          };
          throw error;
        }

        apiPayload = {
          messaging_product: "whatsapp",
          phone_number_id: String(phoneNumberId),
          to: recipientDigits,
          recipient_type: "individual",
          type: String(messageType),
          ...(String(messageType) === "text"
            ? {
              text: {
                body: text,
              },
            }
            : {
              text: {
                body: text,
              },
            }),
        };
      }

      const response = await api.post("/admin/messages/send", apiPayload);

      const data = response.data;

      if (!response.status.toString().startsWith("2")) {
        const error: any = new Error(
          data?.message || data?.error || "Failed to send message",
        );
        error.response = { data };
        throw error;
      }

      return data;
    },
    onSuccess: (response: any, variables: any) => {
      const outgoingText =
        typeof variables?.text === "string" ? variables.text.trim() : "";
      const possibleWamid =
        response?.wamid ||
        response?.id ||
        response?.messageId ||
        response?.data?.wamid ||
        response?.data?.id ||
        response?.data?.messageId ||
        null;

      if (selectedContact?.id && outgoingText) {
        queryClient.setQueryData(
          ["messages", selectedContact.id],
          (oldMessages: Message[] = []) => {
            const optimisticMessage: Message = {
              id: possibleWamid || `tmp-${Date.now()}`,
              contactId: selectedContact.id,
              text: outgoingText,
              direction: "outgoing",
              status: "sent",
              createdAt: new Date().toISOString(),
              whatsappMessageId: possibleWamid,
            };
            return [...oldMessages, optimisticMessage];
          },
        );
      }

      queryClient.invalidateQueries({
        queryKey: ["messages", selectedContact?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      reset();
      setSelectedFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
      toast.success("Message sent successfully!");
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      const code =
        error?.response?.data?.code ||
        error?.response?.data?.details?.error?.code ||
        error?.response?.data?.error?.code;
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.details?.message ||
        error?.response?.data?.details?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to send message";

      if (code === "131047") {
        toast.error("24h window closed. Send a template message to re-engage.");
      } else {
        toast.error(msg);
      }
    },
  });

  // 24-hour customer service window (for selected contact)
  const HOURS_24_MS = 24 * 60 * 60 * 1000;
  const windowState = React.useMemo(() => {
    if (!selectedContact?.lastInboundAt) {
      return { isOpen: false, remainingText: null };
    }
    const last = new Date(selectedContact.lastInboundAt).getTime();
    const elapsed = Date.now() - last;
    if (elapsed > HOURS_24_MS) {
      return { isOpen: false, remainingText: null };
    }
    const remaining = HOURS_24_MS - elapsed;
    const h = Math.floor(remaining / (60 * 60 * 1000));
    const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return {
      isOpen: true,
      remainingText: `${h}h ${m}m left`,
    };
  }, [selectedContact?.lastInboundAt, windowTick]);

  useEffect(() => {
    const t = setInterval(() => setWindowTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch isWindowOpen from API
  useEffect(() => {
    const fetchWindowState = async () => {
      if (!selectedContact || !selectedPhone) {
        setIsWindowOpenFromAPI(true);
        return;
      }

      const token = getConsoleToken();
      if (!token) {
        return;
      }

      try {
        const query = new URLSearchParams({
          phone_number_id: selectedPhone,
          leadNumber: normalizePhone(selectedContact.phone || ""),
        });

        const response = await api.get(
          `/admin/messages/lead/conversations?${query.toString()}`
        );

        const data = response.data;
        if (data?.data?.isWindowOpen !== undefined) {
          setIsWindowOpenFromAPI(data.data.isWindowOpen);
          if (DEBUG_INBOX) {
            console.log("Window Open Status:", data.data.isWindowOpen);
          }
        }
      } catch (error) {
        console.error("Failed to fetch window state:", error);
      }
    };

    fetchWindowState();
    const interval = setInterval(fetchWindowState, 30000);
    return () => clearInterval(interval);
  }, [selectedContact, selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- Close attach menu when clicking outside ---------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (showAttachMenu) {
        const attachMenu = document.querySelector(".attach-menu");
        const attachButton = document.querySelector(".attach-button");
        if (
          attachMenu &&
          !attachMenu.contains(target) &&
          !attachButton?.contains(target)
        ) {
          setShowAttachMenu(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachMenu]);

  /* ---------- Handle file selection ---------- */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setShowAttachMenu(false);
    }
  };

  /* ---------- Voice Recording Functions ---------- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      const supportedFormats = [
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];

      for (const format of supportedFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          console.log("Recording with format:", mimeType);
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /* ---------- Send message ---------- */
  const handleSend = async () => {
    if (!selectedContact) return;
    if (
      !messageValue.trim() &&
      !selectedFile &&
      !audioBlob &&
      !selectedGalleryMedia
    )
      return;

    // Handle media sending via ngrok API
    if (selectedFile || audioBlob || selectedGalleryMedia) {
      setIsSendingMedia(true);
      try {
        const formData = new FormData();
        formData.append("to", normalizePhone(selectedContact.phone || ""));
        formData.append("phone_number_id", outboundPhoneNumberId);
        if (messageValue.trim()) {
          formData.append("caption", messageValue.trim());
        }

        if (selectedGalleryMedia) {
          formData.append("galleryMediaId", selectedGalleryMedia.id.toString());
        } else if (selectedFile) {
          formData.append("file", selectedFile);
        } else if (audioBlob) {
          const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
            type: "audio/webm",
          });
          formData.append("file", audioFile);
        }

        const token = getConsoleToken();
        const response = await api.post(
          "/admin/messages/send",
          formData
        );

        const data = await response.json();

        if (data.success) {
          toast.success("Media sent successfully!");
          queryClient.invalidateQueries({
            queryKey: ["messages", selectedContact.id],
          });
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          reset();
          setSelectedFile(null);
          setAudioBlob(null);
          setRecordingTime(0);
          setSelectedGalleryMedia(null);
        } else {
          toast.error(data.message || "Failed to send media");
        }
      } catch (error: any) {
        console.error("Failed to send media:", error);
        toast.error(error?.response?.data?.message || "Failed to send media");
      } finally {
        setIsSendingMedia(false);
      }
      return;
    }

    // Text-only message
    try {
      const outgoingText = messageValue.trim();
      await sendMessageMutation.mutateAsync({
        contactId: selectedContact.id,
        text: outgoingText,
        message: outgoingText,
        content: outgoingText,
        type: "text",
        message_type: "text",
        phone_number_id: outboundPhoneNumberId,
        recipient: normalizeLeadNumber(selectedContact.phone || ""),
      });
    } catch {
      // Error toast is already handled in mutation onError.
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inboxMenuRef.current &&
        !inboxMenuRef.current.contains(e.target as Node)
      ) {
        setShowInboxMenu(false);
        setActiveSubMenu(null);
        setShowTimeRange(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFailed = (s?: string) => {
    const normalized = String(s || "").trim().toLowerCase();
    return normalized === "failed";
  };

  const hasFailureSignal = (msg: Message) =>
    Boolean(
      msg.errorMessage ||
      msg.error ||
      msg.errorCode ||
      (msg as any).failedAt ||
      (msg as any).failed_at,
    );

  const getErrorMessage = (msg: Message) => {
    if (msg.errorMessage) return msg.errorMessage;
    if (msg.error) {
      try {
        const parsed = JSON.parse(msg.error);
        return parsed?.message || parsed?.error_user_msg || parsed?.error_user_title || msg.error;
      } catch {
        return msg.error;
      }
    }
    return "Message delivery failed";
  };

  const MessageStatus = ({
    status,
    direction,
    error,
    errorCode,
    readAt,
    deliveredAt,
    failedAt,
  }: {
    status?: string;
    direction?: string;
    error?: string | null;
    errorCode?: string | null;
    readAt?: any;
    deliveredAt?: any;
    failedAt?: any;
  }) => {
    if (direction !== "outgoing") return null;

    const isRead = status === "read" || status === "READ" || !!readAt;
    const isDelivered = status === "delivered" || status === "DELIVERED" || !!deliveredAt || isRead;

    if (isRead) {
      return <CheckCheck size={14} className="text-blue-500 ml-0.5" />;
    }
    if (isDelivered) {
      return <CheckCheck size={14} className="text-slate-500 ml-0.5" />;
    }
    if (isFailed(status) && (error || errorCode || failedAt)) {
      return (
        <span
          title={error || "Message delivery failed"}
          className="ml-1 cursor-help flex items-center group/fail"
        >
          <AlertCircle
            size={14}
            className="text-red-600 animate-pulse transition-transform hover:scale-110"
          />
        </span>
      );
    }
    return <Check size={14} className="text-slate-400 ml-0.5" />;
  };

  const getContactReminders = (contactId: number) =>
    reminders.filter(
      (r: any) => r.contactId === contactId && isReminderActive(r),
    );

  const ContactItem = ({
    contact,
    isSelected,
    onClick,
    reminders: contactReminders = [],
  }: ContactItemProps) => (
    <div
      onClick={onClick}
      className={`contact-item flex flex-col cursor-pointer border-b border-blue-200 dark:border-blue-700 ${isSelected ? "selected" : "bg-transparent"
        }`}
    >
      {/* Main contact row */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3 flex-1">
          <div className="contact-avatar w-12 h-12 rounded-full flex items-center justify-center font-bold text-white">
            {contact.initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold truncate ${isSelected && contactPermissions && !contactPermissions.show_details ? 'blur-sm select-none' : ''}`}>
              {contact.name}
            </p>
            {contact.lastMessagePreview && (
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate w-full">
                {formatPreviewText(contact.lastMessagePreview)}
              </p>
            )}
            {!contact.lastMessagePreview && contact.phone && (
              <p className={`text-xs text-gray-500 truncate ${isSelected && contactPermissions && !contactPermissions.show_details ? 'blur-sm select-none' : ''}`}>
                {contact.phone}
              </p>
            )}
            {Array.isArray(contact.tags) && contact.tags.length > 0 && (
              <div className="mt-1 flex gap-1 flex-wrap">
                {contact.tags.map((tid: any) => {
                  const tagObj = (contactTags as any[]).find((t) => String(t.id) === String(tid));
                  return (
                    <span key={String(tid)} className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                      {tagObj?.name || String(tid)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end justify-center gap-1">
          {/* Unread Count Badge */}
          {(contact.unreadCount ?? 0) > 0 && (
            <span className="unread-badge text-xs font-bold text-white w-5 h-5 flex items-center justify-center rounded-full">
              {contact.unreadCount}
            </span>
          )}

          {/* Last Message Time */}
          {contact.lastMessageTime && (
            <span className={`text-[10px] font-medium leading-none ${(contact.unreadCount ?? 0) > 0 ? "text-blue-500" : "text-gray-500 dark:text-gray-400"
              }`}>
              {new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {/* Bell Icon with Hover Tooltip */}
          <div className="relative group" onClick={(e) => e.stopPropagation()}>
            {/* Tooltip appears on hover */}
            {contactReminders.length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border-2 border-amber-500 dark:border-amber-600 rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-100 pointer-events-none">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-200 dark:border-amber-700">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Scheduled Reminders ({contactReminders.length})
                    </p>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {contactReminders.map((reminder: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs space-y-1 pb-2 border-b border-amber-100 dark:border-amber-800 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {reminder.message?.substring(0, 60)}
                          {reminder.message?.length > 60 ? "..." : ""}
                        </p>
                        <p className="text-amber-600 dark:text-amber-400">
                          📅 {new Date(reminder.startDate).toLocaleDateString()}
                          {reminder.startTime && ` at ${reminder.startTime}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute -top-2 right-4 w-4 h-4 bg-white dark:bg-gray-800 border-l-2 border-t-2 border-amber-500 dark:border-amber-600 transform rotate-45"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`inbox-page h-[calc(100vh-73px)] overflow-hidden relative w-full flex lg:grid lg:grid-cols-[380px_1fr] lg:grid-rows-1`}
    >
      {/* Contacts Sidebar */}
      <div className={`contacts-sidebar flex-col lg:w-[380px] ${selectedContact ? "hidden lg:flex" : "flex"}`}>
        {/* Contacts Sidebar */}
        <div
          className="contacts-sidebar w-full flex flex-col h-full border-r-2 border-blue-300 dark:border-blue-700 overflow-x-hidden"
        >
          {/* Header Section */}
          <div className="contacts-header bg-blue-600 text-white p-4 font-bold flex items-center justify-between relative border-b-2 border-blue-500 shadow-sm h-18 py-3.75 px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(prev => !prev)}
                className="lg:hidden text-white"
              >
                ☰
              </button>
              <span className="font-bold text-white text-lg">Inbox</span>
            </div>

            {/* Right side — Dropdown */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowInboxMenu(!showInboxMenu)}
                className="p-2 rounded-full hover:bg-blue-500 transition-all"
              >
                <MoreVertical className="cursor-pointer text-white" />
              </button>

              {/* Dropdown Section */}
              {showInboxMenu && (
                <div
                  ref={inboxMenuRef}
                  className="dropdown-menu absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] p-3 space-y-2"
                >
                  {/* Unread Row */}
                  <div
                    ref={unreadRef}
                    onClick={() =>
                      setActiveSubMenu(
                        activeSubMenu === "unreadTime"
                          ? null
                          : "unreadTime",
                      )
                    }
                    className="dropdown-item text-sm font-normal text-blue-600 px-2 py-1 cursor-pointer hover:bg-blue-50 rounded"
                  >
                    Unread
                  </div>

                  {/* Floating Time Filter Box */}
                  {activeSubMenu === "unreadTime" && unreadRef.current && (
                    <>
                      <div
                        className="absolute z-50 bg-white border border-blue-200 rounded shadow-lg p-3 w-48 space-y-2"
                        style={{
                          top: unreadRef.current?.offsetTop,
                          left:
                            (unreadRef.current.offsetLeft || 0) +
                            (unreadRef.current.offsetWidth || 0) +
                            12,
                        }}
                      >
                        <div
                          ref={dateRef}
                          onClick={() => {
                            setShowDatePicker(!showDatePicker);
                            setShowTimeRange(false);
                          }}
                          className="dropdown-item text-sm font-normal text-blue-600 cursor-pointer hover:bg-blue-50 rounded"
                        >
                          Date
                        </div>

                        {showDatePicker && dateRef.current && (
                          <div
                            className="absolute z-50 bg-white border border-blue-200 rounded shadow-lg p-3 w-56"
                            style={{
                              top: (dateRef.current?.offsetTop ?? 0) + 5,
                              left:
                                (dateRef.current?.offsetLeft ?? 0) +
                                (dateRef.current?.offsetWidth ?? 0) +
                                4,
                            }}
                          >
                            <input
                              type="date"
                              className="w-full px-2 py-2 text-sm border border-blue-200 rounded bg-white cursor-pointer"
                            />
                          </div>
                        )}

                        <div
                          ref={timeRef}
                          onClick={() => {
                            setShowTimeRange(!showTimeRange);
                            setShowDatePicker(false);
                          }}
                          className="dropdown-item text-sm font-normal text-blue-600 cursor-pointer hover:bg-blue-50 rounded"
                        >
                          Time
                        </div>

                        {[
                          "All",
                          "Past hour",
                          "Past 2 hours",
                          "Past week",
                          "Past month",
                          "Past year",
                        ].map((label) => (
                          <div
                            key={label}
                            className="dropdown-item text-sm font-normal text-blue-600 cursor-pointer hover:bg-blue-50 rounded"
                          >
                            {label}
                          </div>
                        ))}
                      </div>

                      {showTimeRange && timeRef.current && (
                        <div
                          className="absolute z-50 bg-white border border-blue-200 rounded shadow-lg p-3"
                          style={{
                            top: timeRef.current?.offsetTop || 0,
                            left:
                              (timeRef.current?.offsetLeft || 0) +
                              (timeRef.current?.offsetWidth || 0) +
                              20,
                            width: "180px",
                          }}
                        >
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <select className="w-25 px-1 py-1 text-xs border border-blue-200 rounded bg-white text-gray-800">
                              {[...Array(12)]
                                .map((_, i) =>
                                  i === 0 ? "12:00" : `${i}:00`,
                                )
                                .map((time) => (
                                  <option key={time}>{time}</option>
                                ))}
                            </select>
                            <select className="w-26.25 px-1 py-1 text-xs border border-blue-200 rounded bg-white text-gray-800">
                              {["AM", "PM"].map((meridian) => (
                                <option key={meridian}>{meridian}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <select className="w-25 px-1 py-1 text-xs border border-blue-200 rounded bg-white text-gray-800">
                              {[...Array(12)]
                                .map((_, i) =>
                                  i === 0 ? "12:00" : `${i}:00`,
                                )
                                .map((time) => (
                                  <option key={time}>{time}</option>
                                ))}
                            </select>
                            <select className="w-26.25 px-1 py-1 text-xs border border-blue-200 rounded bg-white text-gray-800">
                              {["AM", "PM"].map((meridian) => (
                                <option key={meridian}>{meridian}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {["Assigned", "Unassigned"].map((label) => (
                    <button
                      key={label}
                      onClick={() => {
                        setActiveDropdown(label as any);
                        setShowTimeFilter(label === "Unread");
                        setActiveSubMenu(null);
                        setShowInboxMenu(false);
                      }}
                      className="dropdown-item w-full text-left text-sm font-normal text-blue-600 cursor-pointer hover:bg-blue-50 rounded"
                    >
                      {label}
                    </button>
                  ))}

                  <div className="border-t border-gray-100 my-2" />

                  <div className="space-y-2">
                    <div
                      ref={assignedRef}
                      onClick={() =>
                        setActiveSubMenu(
                          activeSubMenu === "assignedTo"
                            ? null
                            : "assignedTo",
                        )
                      }
                      className="dropdown-item text-sm font-normal text-blue-600 cursor-pointer hover:bg-blue-50 rounded"
                    >
                      Assigned to
                    </div>

                    {activeSubMenu === "assignedTo" &&
                      assignedRef.current && (
                        <div
                          className="absolute z-50"
                          style={{
                            top: assignedRef.current.offsetTop,
                            left:
                              assignedRef.current.offsetLeft +
                              assignedRef.current.offsetWidth +
                              12,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="demo"
                            className="w-48 px-3 py-2 text-sm border border-blue-200 rounded bg-white text-gray-800 shadow-sm"
                          />
                        </div>
                      )}

                    <div
                      ref={phoneRef}
                      onClick={() =>
                        setActiveSubMenu(
                          activeSubMenu === "phoneNumbers"
                            ? null
                            : "phoneNumbers",
                        )
                      }
                      className="dropdown-item text-sm font-normal text-blue-600 cursor-pointer hover:bg-blue-50 rounded"
                    >
                      Phone number
                    </div>

                    {activeSubMenu === "phoneNumbers" &&
                      phoneRef.current && (
                        <div
                          className="absolute z-50"
                          style={{
                            top: phoneRef.current.offsetTop || 0,
                            left:
                              (phoneRef.current.offsetLeft || 0) +
                              (phoneRef.current.offsetWidth || 0) +
                              12,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="number"
                            className="w-48 px-3 py-2 text-sm border border-blue-200 rounded bg-white text-gray-800 shadow-sm"
                          />
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Search Bar + Filter Chips */}
          <div className="px-6 pt-4 pb-3 shrink-0">


            <div className="relative flex items-center gap-3">
              <div className="relative flex-1">
                {!searchQuery.trim() && (
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300">
                    <Search size={18} />
                  </span>
                )}

                <input
                  type="search"
                  placeholder="Find conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 ${searchQuery.trim() ? "pl-4" : "pl-16"}`}
                />
              </div>

              {/* Filter button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilterMenu((s) => !s)}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-blue-600 hover:bg-gray-50"
                  title="Filter conversations"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                </button>

                <button className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" title="Contacts">
                  <Users size={18} />
                </button>
              </div>

              {/* Filter dropdown */}
              {showFilterMenu && (
                <div className="filter-dropdown absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] p-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Filter Conversations</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-blue-600">
                      <input type="checkbox" className="rounded" />
                      <span>Unread</span>
                    </label>
                    <label className="flex items-center gap-2 text-blue-600">
                      <input type="checkbox" className="rounded" />
                      <span>Assigned</span>
                    </label>
                    <label className="flex items-center gap-2 text-blue-600">
                      <input type="checkbox" className="rounded" />
                      <span>Unassigned</span>
                    </label>
                  </div>

                  <div className="border-t border-gray-100 my-3" />

                  <div className="text-sm font-medium text-gray-700 mb-2">Select Phone Number</div>
                  <div className="space-y-1 max-h-48 overflow-auto">
                    {phoneNumbers.map((pn: any) => {
                      const id = String(pn.phoneNumberId || pn.id || pn.displayPhone || pn.phone_number);
                      const isSelected = selectedPhone === id;
                      const disp = pn.displayPhone || pn.phone_number || pn.number || id;
                      return (
                        <button
                          key={id}
                          onClick={() => handlePhoneSelect(id)}
                          className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                          {disp}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                Showing {paginatedContacts.length} of {filteredContacts.length} contacts ({currentPage} of {totalPages})
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{
              minHeight: 0,
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #f3f4f6'
            }}
          >
            {loadingContacts && (
              <p className="p-4 text-blue-600">Loading...</p>
            )}
            {paginatedContacts.map((c: any) => (
              <ContactItem
                key={c.id}
                contact={c}
                isSelected={selectedContact?.id === c.id}
                onClick={() => handleContactSelect(c)}
                reminders={getContactReminders(c.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div
        className={`
 chat-area
flex flex-col min-h-0 h-full
w-full
${selectedContact ? "flex absolute inset-0 z-40 bg-white dark:bg-gray-900" : "hidden"}
lg:relative lg:flex
  `}
      >
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-blue-600 p-6">
            <MessageSquare
              size={60}
              className={`${PRIMARY_TEXT} ${iconJumpAnimation}`}
            />
            <p className="mt-4 font-semibold">
              Select a contact to start chatting
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Chat Header */}
            <div
              className={`contacts-header text-white p-4 flex justify-between items-center rounded-tr-2xl border-b-2 border-blue-300 dark:border-blue-600 shadow-md`}
              style={{ height: "72px" }}
            >
              <div className="flex items-center gap-3">
                {/* Back button (mobile) */}
                <button
                  onClick={() => {
                    setSelectedContact(null);
                  }}
                  className={`${iconJumpAnimation} lg:hidden`}
                >
                  <ArrowLeft className={iconJumpAnimation} />
                </button>

                {/* DP */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/60 text-black dark:text-white font-bold">
                  {selectedContact?.initials}
                </div>

                {/* Contact info */}
                <div className="flex flex-col leading-tight">
                  {(() => {
                    const headerName = selectedContact?.name || "Unknown";
                    const headerPhone = removePlusPrefix(selectedContact?.phone || "");
                    const showHeaderPhone =
                      !!headerPhone && !isSamePhoneValue(headerName, headerPhone);
                    const shouldBlur = contactPermissions && !contactPermissions.show_details;

                    return (
                      <>
                        <span className={`font-semibold text-black text-sm ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                          {headerName}
                        </span>
                        {showHeaderPhone ? (
                          <span className={`text-xs text-blue-200 ${shouldBlur ? 'blur-sm select-none' : ''}`}>
                            {headerPhone}
                          </span>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Action icons */}
              <div className="flex items-center gap-4 text-white">
                {/* Assign User Icon & Dropdown — admin only */}
                {isAdmin && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isHeaderUserDropdownOpen;
                        setIsHeaderUserDropdownOpen(next);
                        if (next) {
                          // Sync pending selection to current assignment when opening
                          setPendingAssignUserId(selectedContact?.assigned_to ?? '');
                          setPendingShowDetails(true);
                          setPendingCanChat(true);
                          setHeaderUserSearchQuery('');
                        }
                      }}
                      className={`${iconJumpAnimation} hover:text-blue-600 transition-colors duration-200 flex items-center justify-center`}
                    >
                      <UserPlus size={18} />
                      {/* Visual indicator dot if assigned to someone */}
                      {selectedContact?.assigned_to && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></span>
                      )}
                    </button>
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 whitespace-nowrap shadow-lg border border-blue-300 font-semibold transform group-hover:translate-y-0.5 z-[70]">
                      Assign Contact
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-blue-300"></div>
                    </span>

                    {/* Click-away backdrop overlay */}
                    {isHeaderUserDropdownOpen && (
                      <div
                        className="fixed inset-0 z-50 cursor-default"
                        onClick={() => {
                          setIsHeaderUserDropdownOpen(false);
                          setHeaderUserSearchQuery('');
                        }}
                      />
                    )}

                    {/* Popover Menu content */}
                    {isHeaderUserDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-[420px] rounded-xl shadow-2xl bg-white text-gray-900 border border-gray-200 z-[80] flex flex-col overflow-hidden max-h-[560px]">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign Contact</p>
                          <p className="text-sm font-medium text-gray-800 mt-1">
                            Currently:{' '}
                            <span className={`font-semibold ${selectedContact?.assigned_to ? 'text-blue-600' : 'text-gray-400'}`}>
                              {!selectedContact?.assigned_to
                                ? 'Unassigned'
                                : users.find(u => String(u.id) === String(selectedContact.assigned_to?.trim()))?.name || 'Unknown'}
                            </span>
                          </p>
                        </div>

                        {/* Search Input */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={headerUserSearchQuery}
                              onChange={(e) => setHeaderUserSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50"
                            />
                          </div>
                        </div>

                        {/* Scrollable User List */}
                        <div className="overflow-y-auto max-h-[320px] py-2">
                          {/* Remove Assignment option — only show if contact is currently assigned */}
                          {selectedContact?.assigned_to && (
                            <div
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsHeaderUserDropdownOpen(false);
                                setHeaderUserSearchQuery('');
                                await handleRemoveAssignment();
                              }}
                              className="flex items-center gap-3 mx-3 px-3 py-2.5 mb-1 rounded-lg cursor-pointer select-none transition-all hover:bg-red-50 border border-transparent hover:border-red-200"
                            >
                              <div className="w-5 h-5 rounded-full border-2 border-red-400 flex items-center justify-center flex-shrink-0">
                                <div className="w-2 h-0.5 bg-red-400 rounded-full" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-red-600">Remove Assignment</span>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Currently: {users.find(u => String(u.id) === String(selectedContact.assigned_to?.trim()))?.name || 'Assigned'}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedContact?.assigned_to && <div className="mx-4 my-2 border-t border-gray-100" />}

                          {/* Users list */}
                          {users
                            .filter(user =>
                              user.name?.toLowerCase().includes(headerUserSearchQuery.toLowerCase()) ||
                              user.email?.toLowerCase().includes(headerUserSearchQuery.toLowerCase())
                            )
                            .map(user => {
                              const isSelected = pendingAssignUserId === String(user.id);
                              const initials = (user.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                              return (
                                <div key={user.id} className="px-3 mb-1">
                                  {/* User row */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingAssignUserId(String(user.id));
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-all ${isSelected
                                      ? 'bg-blue-50 border border-blue-200'
                                      : 'hover:bg-gray-50 border border-transparent'
                                      }`}
                                  >
                                    {/* Radio indicator */}
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                                      {initials}
                                    </div>
                                    {/* Name + email */}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{user.name}</p>
                                      <p className="text-xs text-gray-500 truncate mt-0.5">{user.email || user.phone || '—'}</p>
                                    </div>
                                  </div>

                                  {/* Options panel — only shown when this user is selected */}
                                  {isSelected && (
                                    <div className="mx-3 mb-3 mt-2 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Permissions</p>
                                      </div>

                                      {/* Show Details */}
                                      <div className="mb-3 p-3 bg-white rounded-lg border border-gray-100">
                                        <p className="text-sm font-semibold text-gray-800 mb-1">Show Details</p>
                                        <p className="text-xs text-gray-500 mb-2.5">Can view contact name & phone</p>
                                        <div className="flex gap-2">
                                          <label className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border cursor-pointer transition-all font-semibold text-sm ${pendingShowDetails ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                                            <input type="radio" name={`show_details_${user.id}`} className="sr-only" checked={pendingShowDetails} onChange={() => setPendingShowDetails(true)} />
                                            Yes
                                          </label>
                                          <label className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border cursor-pointer transition-all font-semibold text-sm ${!pendingShowDetails ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'}`}>
                                            <input type="radio" name={`show_details_${user.id}`} className="sr-only" checked={!pendingShowDetails} onChange={() => setPendingShowDetails(false)} />
                                            No
                                          </label>
                                        </div>
                                      </div>

                                      {/* Can Chat */}
                                      <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <p className="text-sm font-semibold text-gray-800 mb-1">Can Chat</p>
                                        <p className="text-xs text-gray-500 mb-2.5">Can send messages to this contact</p>
                                        <div className="flex gap-2">
                                          <label className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border cursor-pointer transition-all font-semibold text-sm ${pendingCanChat ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'}`}>
                                            <input type="radio" name={`can_chat_${user.id}`} className="sr-only" checked={pendingCanChat} onChange={() => setPendingCanChat(true)} />
                                            Yes
                                          </label>
                                          <label className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border cursor-pointer transition-all font-semibold text-sm ${!pendingCanChat ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'}`}>
                                            <input type="radio" name={`can_chat_${user.id}`} className="sr-only" checked={!pendingCanChat} onChange={() => setPendingCanChat(false)} />
                                            No
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                          {users.filter(u =>
                            u.name?.toLowerCase().includes(headerUserSearchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(headerUserSearchQuery.toLowerCase())
                          ).length === 0 && (
                              <div className="px-4 py-6 text-sm text-gray-400 text-center">
                                <p className="font-medium">No users found</p>
                                <p className="text-xs mt-1">Try a different search term</p>
                              </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsHeaderUserDropdownOpen(false);
                              setHeaderUserSearchQuery('');
                            }}
                            className="flex-1 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors font-semibold shadow-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={pendingAssignUserId === undefined}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (pendingAssignUserId === undefined) return;
                              setIsHeaderUserDropdownOpen(false);
                              setHeaderUserSearchQuery('');
                              await handleHeaderAssignContact(pendingAssignUserId ?? '', pendingShowDetails, pendingCanChat);
                            }}
                            className="flex-1 py-2.5 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold shadow-sm"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )} {/* end isAdmin */}

                <div className="relative group">
                  <MoreVertical
                    size={15}
                    className={`${iconJumpAnimation} hover:text-blue-600 transition-colors duration-200`}
                  />
                  <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 whitespace-nowrap shadow-lg border border-blue-300 font-semibold transform group-hover:translate-y-0.5">
                    Options
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-blue-300"></div>
                  </span>
                </div>

              </div>

            </div>
            <div className="h-px w-full bg-gray-300 dark:bg-gray-700"></div>

            {/* 24-hour window banner */}
            {selectedContact && (
              <div
                className={`px-4 py-2 text-sm font-medium ${isWindowOpenFromAPI
                  ? "bg-blue-500/20 text-blue-800 dark:text-blue-200"
                  : "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                  }`}
              >
                {isWindowOpenFromAPI ? (
                  <span>{windowState.remainingText} — You can send any message</span>
                ) : (
                  <span>24h window closed — Send a template to re-engage</span>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto chat-messages min-h-0">
              {(() => {
                const items: Array<
                  | { type: "date"; label: string }
                  | { type: "message"; msg: Message }
                > = [];
                let lastDateLabel: string | null = null;
                for (const msg of messages) {
                  const dateLabel = getDateGroupLabel(
                    new Date(msg.createdAt),
                  );
                  if (dateLabel !== lastDateLabel) {
                    items.push({ type: "date", label: dateLabel });
                    lastDateLabel = dateLabel;
                  }
                  items.push({ type: "message", msg });
                }
                return items.map((item, i) =>
                  item.type === "date" ? (
                    <div
                      key={`date-${i}-${item.label}`}
                      className="chat-date-badge"
                    >
                      {item.label}
                    </div>
                  ) : (
                    (() => {
                      const msg = item.msg;
                      const messageText =
                        typeof msg.text === "string"
                          ? msg.text
                          : msg.text == null
                            ? ""
                            : String(msg.text);
                      const failed =
                        isMyMessage(msg) &&
                        isFailed(msg.status) &&
                        hasFailureSignal(msg);
                      const isOutgoing = isMyMessage(msg);
                      return (
                        <div
                          key={msg.id}
                          className={`message ${isOutgoing ? "outgoing" : "incoming"} ${failed ? "failed" : ""}`}
                        >
                          <div className="bubble">
                            {msg.isTemplate && Array.isArray(msg.templateComponents) && msg.templateComponents.length > 0 ? (
                              <>
                                <TemplateMessage
                                  components={msg.templateComponents}
                                  mediaUrl={msg.mediaUrl}
                                  phoneNumberId={outboundPhoneNumberId}
                                  templateName={msg.templateName}
                                  templateLanguage={msg.templateLanguage}
                                  contentPayload={msg.templateContent}
                                />
                                {!msg.templateComponents.some(
                                  (component: any) =>
                                    !!component?.text ||
                                    (Array.isArray(component?.buttons) && component.buttons.length > 0) ||
                                    !!component?.example?.header_handle?.length,
                                ) && (
                                    <div className="text">{messageText || "Template message sent"}</div>
                                  )}
                                {failed && (
                                  <div className="error-box">
                                    <strong>Failed</strong>
                                    {msg.errorCode ? ` (#${msg.errorCode})` : ""}{" "}
                                    {getErrorMessage(msg)}
                                  </div>
                                )}
                                <div className={`meta ${failed ? "error" : ""}`}>
                                  <span className="time">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span className={`status ${msg.status === "read" || msg.status === "delivered" ? "sent" : ""}`}>
                                    <MessageStatus
                                      status={msg.status}
                                      direction={msg.direction}
                                      error={msg.errorMessage || msg.error || null}
                                      errorCode={msg.errorCode || null}
                                      readAt={(msg as any).readAt}
                                      deliveredAt={(msg as any).deliveredAt}
                                      failedAt={(msg as any).failedAt || (msg as any).failed_at}
                                    />
                                  </span>
                                </div>
                              </>
                            ) : getButtonMessageContent(msg) ? (
                              (() => {
                                const btnContent = getButtonMessageContent(msg)!;
                                return (
                                  <>
                                    <div className="template-body">{btnContent.text}</div>
                                    {btnContent.buttons.map((btn: string, i: number) => (
                                      <a key={i} className="template-button" href="#">
                                        {btn}
                                      </a>
                                    ))}
                                    {failed && (
                                      <div className="error-box">
                                        <strong>Failed</strong>
                                        {msg.errorCode ? ` (#${msg.errorCode})` : ""}{" "}
                                        {getErrorMessage(msg)}
                                      </div>
                                    )}
                                    <div className={`meta ${failed ? "error" : ""}`}>
                                      <span className="time">
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      <span className={`status ${msg.status === "read" || msg.status === "delivered" ? "sent" : ""}`}>
                                        <MessageStatus
                                          status={msg.status}
                                          direction={msg.direction}
                                          error={msg.errorMessage || msg.error || null}
                                          errorCode={msg.errorCode || null}
                                          readAt={(msg as any).readAt}
                                          deliveredAt={(msg as any).deliveredAt}
                                          failedAt={(msg as any).failedAt || (msg as any).failed_at}
                                        />
                                      </span>
                                    </div>
                                  </>
                                );
                              })()
                            ) : msg.type === "interactive" ? (
                              <>
                                <div className="flex items-center gap-2 mb-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  {isOutgoing ? "Sent Button Option" : "Clicked Button"}
                                </div>
                                <div className="inline-flex items-center px-4 py-2 border-2 border-blue-500/20 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-semibold text-sm rounded-xl select-none shadow-sm">
                                  {messageText}
                                </div>
                                {failed && (
                                  <div className="error-box">
                                    <strong>Failed</strong>
                                    {msg.errorCode ? ` (#${msg.errorCode})` : ""}{" "}
                                    {getErrorMessage(msg)}
                                  </div>
                                )}
                                <div className={`meta ${failed ? "error" : ""}`}>
                                  <span className="time">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span className={`status ${msg.status === "read" || msg.status === "delivered" ? "sent" : ""}`}>
                                    <MessageStatus
                                      status={msg.status}
                                      direction={msg.direction}
                                      error={msg.errorMessage || msg.error || null}
                                      errorCode={msg.errorCode || null}
                                      readAt={(msg as any).readAt}
                                      deliveredAt={(msg as any).deliveredAt}
                                      failedAt={(msg as any).failedAt || (msg as any).failed_at}
                                    />
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                {msg.mediaUrl && (
                                  <div className="message-media mb-2">
                                    {msg.messageType === "image" || msg.mediaType?.startsWith("image/") ? (
                                      <img
                                        src={msg.mediaUrl}
                                        alt="Sent image"
                                        className="block max-w-[260px] w-full h-auto rounded-lg cursor-pointer hover:opacity-90"
                                        style={{ maxHeight: '320px', objectFit: 'cover' }}
                                        onClick={() => window.open(msg.mediaUrl!, "_blank")}
                                      />
                                    ) : msg.messageType === "video" || msg.mediaType?.startsWith("video/") ? (
                                      <video src={msg.mediaUrl} controls className="block max-w-[260px] w-full h-auto rounded-lg" />
                                    ) : msg.messageType === "audio" || msg.mediaType?.startsWith("audio/") ? (
                                      <audio src={msg.mediaUrl} controls className="w-full max-w-[260px]" />
                                    ) : (
                                      <a
                                        href={msg.mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                      >
                                        <FileText className="w-8 h-8 text-orange-500" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Document</p>
                                          <p className="text-xs text-blue-600">Click to download</p>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                )}
                                {messageText && !messageText.startsWith("[") ? (
                                  <div className="text">{messageText}</div>
                                ) : !msg.mediaUrl ? (
                                  <div className="text opacity-70">
                                    {isOutgoing ? "Message sent" : "Message received"}
                                  </div>
                                ) : null}
                                {failed && (
                                  <div className="error-box">
                                    <strong>Failed</strong>
                                    {msg.errorCode ? ` (#${msg.errorCode})` : ""}{" "}
                                    {getErrorMessage(msg)}
                                  </div>
                                )}
                                <div className={`meta ${failed ? "error" : ""}`}>
                                  <span className="time">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span className={`status ${msg.status === "read" || msg.status === "delivered" ? "sent" : ""}`}>
                                    <MessageStatus
                                      status={msg.status}
                                      direction={msg.direction}
                                      error={msg.errorMessage || msg.error || null}
                                      errorCode={msg.errorCode || null}
                                      readAt={(msg as any).readAt}
                                      deliveredAt={(msg as any).deliveredAt}
                                      failedAt={(msg as any).failedAt || (msg as any).failed_at}
                                    />
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )
                );
              })()}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Section with File Attachment */}
            <div className="relative w-full px-5 py-4 shrink-0 bg-white dark:bg-gray-900">
              {/* Previews Container - Fixed Height */}
              <div className="mb-3 min-h-0">
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-600">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        📎 {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Gallery Media Preview */}
                {selectedGalleryMedia && (
                  <div className="mb-2 flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-600">
                    {selectedGalleryMedia.type?.startsWith("image/") ? (
                      <img
                        src={selectedGalleryMedia.url}
                        alt={selectedGalleryMedia.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {selectedGalleryMedia.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        From Gallery • {selectedGalleryMedia.size}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedGalleryMedia(null)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Audio Recording Preview */}
                {audioBlob && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-600">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Mic size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Voice Message
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Duration: {formatTime(recordingTime)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAudioBlob(null);
                        setRecordingTime(0);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="mb-2 flex items-center justify-between gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-600">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        Recording... {formatTime(recordingTime)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelRecording}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={stopRecording}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Bar - Fixed Position */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full px-4 py-3 shadow-md border-2 border-blue-300 dark:border-blue-500">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileSelect}
                />

                {/* Attachment Button & Menu */}
                <div className="relative">
                  <Paperclip
                    size={20}
                    onClick={() => isWindowOpenFromAPI && setShowAttachMenu(!showAttachMenu)}
                    className={`attach-button ${iconJumpAnimation} ${isWindowOpenFromAPI
                      ? "text-blue-600 cursor-pointer hover:text-blue-700"
                      : "text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                      }`}
                  />

                  {showAttachMenu && (
                    <div className="attach-menu absolute bottom-12 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-blue-200 dark:border-blue-600 p-2 w-48 z-50 space-y-1">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-200 transition-colors"
                      >
                        <span className="text-lg">📷</span>
                        <span>Upload File</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAttachMenu(false);
                          setShowGalleryPicker(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-200 transition-colors"
                      >
                        <Image size={18} className="text-purple-500" />
                        <span>From Gallery</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Template Button */}
                <div className="chat-icon-btn">
                  <button
                    type="button"
                    onClick={() => setShowTemplateSelector(true)}
                    className="text-slate-500 dark:text-slate-300 hover:text-blue-500 transition-colors"
                  >
                    <FileText size={20} />
                  </button>
                </div>

                {/* Text Input */}
                <input
                  type="text"
                  {...register("message")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    !contactPermissions?.can_chat
                      ? "View-only access"
                      : isWindowOpenFromAPI
                        ? "Type a message"
                        : "Window closed"
                  }
                  className="message-input flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isRecording || !isWindowOpenFromAPI || !contactPermissions?.can_chat}
                />

                {/* Send Button / Mic */}
                {messageValue.trim() ||
                  selectedFile ||
                  audioBlob ||
                  selectedGalleryMedia ? (
                  <button
                    onClick={handleSend}
                    disabled={
                      sendMessageMutation.isPending ||
                      isSendingMedia ||
                      !isWindowOpenFromAPI ||
                      !contactPermissions?.can_chat
                    }
                    className="btn-primary p-2 rounded-full transition-transform hover:scale-110 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sendMessageMutation.isPending || isSendingMedia ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={18} className="text-white" />
                    )}
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        if (!isWindowOpenFromAPI || !contactPermissions?.can_chat) return;
                        if (isRecording) stopRecording();
                        else startRecording();
                      }}
                      disabled={!isWindowOpenFromAPI}
                      className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-all duration-200 ${!isWindowOpenFromAPI
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed opacity-60"
                        : isRecording
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-white text-blue-700 dark:bg-gray-700 border border-blue-600 dark:border-blue-600 hover:bg-blue-600 hover:text-white"
                        }`}
                    >
                      <Mic size={18} />
                    </button>
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                      {!isWindowOpenFromAPI ? "Please wait for 24H to reply" : isRecording ? "Stop Recording" : "Voice Message"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
        }
      </div >

      {/* FAQ Flow Component */}
      {
        showFAQFlow && selectedContact && (
          <FAQFlow
            contactId={selectedContact.id}
            contactName={selectedContact.name}
            onClose={() => setShowFAQFlow(false)}
            botId={selectedBotForFAQ}
          />
        )
      }

      {/* Template Selector Modal */}
      {
        showTemplateSelector && selectedContact && (
          <TemplateSelectorModal
            isOpen={showTemplateSelector}
            onClose={() => setShowTemplateSelector(false)}
            contactPhone={selectedContact.phone || ""}
            contactName={selectedContact.name}
            phoneNumberId={outboundPhoneNumberId}
            onSend={async (templateId: string | number, variables: Record<string, string>, templateData?: any): Promise<void> => {
              try {
                const token = localStorage.getItem("console_access_token");

                if (!token) {
                  toast.error("Console token required");
                  return;
                }

                if (!selectedContact?.phone) {
                  toast.error("Contact phone is required");
                  return;
                }

                const resolvedPhoneNumberId = String(
                  outboundPhoneNumberId || ""
                ).trim();
                if (!resolvedPhoneNumberId) {
                  toast.error("Phone number ID is required");
                  return;
                }

                const templateComponents = Array.isArray(templateData?.components)
                  ? templateData.components
                  : [];
                const templateVars = getTemplateVariables(templateComponents);
                const formattedParams = formatTemplateParameters(
                  templateVars,
                  variables || {},
                  templateComponents,
                );

                const components: any[] = [];
                if (formattedParams.header.length > 0) {
                  components.push({
                    type: "header",
                    parameters: formattedParams.header,
                  });
                }
                if (formattedParams.body.length > 0) {
                  components.push({
                    type: "body",
                    parameters: formattedParams.body,
                  });
                }
                if (formattedParams.buttons.length > 0) {
                  components.push(...formattedParams.buttons);
                }

                // Build final payload
                const payload = {
                  phone_number_id: resolvedPhoneNumberId,
                  to: selectedContact.phone.replace(/\D/g, ""),
                  type: "template",
                  template: {
                    name: templateData?.name,
                    language: templateData?.language || "en",
                    components: components,
                  },
                };

                console.log("📤 Sending template payload:", JSON.stringify(payload, null, 2));

                // Call EXTERNAL API via api
                const response = await api.post("/admin/messages/send", payload);

                const data = response.data;

                console.log("📥 API Response:", {
                  status: response.status,
                  ok: response.status.toString().startsWith("2"),
                  data,
                });

                if (!response.status.toString().startsWith("2")) {
                  const errorMsg =
                    data?.error ||
                    data?.message ||
                    `Failed to send template (${response.status})`;
                  console.error("❌ Template error:", errorMsg);
                  toast.error(errorMsg);
                  return;
                }

                queryClient.invalidateQueries({
                  queryKey: ["messages", selectedContact.id],
                });
                queryClient.invalidateQueries({ queryKey: ["contacts"] });
                toast.success("Template sent successfully!");
              } catch (error: any) {
                console.error("Error sending template:", error);
                toast.error(error?.message || "Failed to send template");
              }
            }}
          />
        )
      }
      {/* Gallery Picker Modal */}
      <GalleryPickerModal
        isOpen={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={(media) => {
          setSelectedGalleryMedia(media);
          setShowGalleryPicker(false);
        }}
      />
    </div >
  );
}
