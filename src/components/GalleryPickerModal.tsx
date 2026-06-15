/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ngrokAxiosInstance } from "@/lib/axiosInstance";
import { X, Image, FileText, Video, Music, Check } from "lucide-react";

interface MediaItem {
  id: number;
  name: string;
  fileName: string;
  type: string;
  size: string;
  url: string;
}

interface GalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
}

export function GalleryPickerModal({
  isOpen,
  onClose,
  onSelect,
}: GalleryPickerModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [filter, setFilter] = useState<
    "all" | "image" | "video" | "audio" | "document"
  >("all");

  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ["gallery-media"],
    queryFn: async () => {
      const { data } = await ngrokAxiosInstance.get("/api/user/gallery/list");
      return data as MediaItem[];
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const getMediaIcon = (type: string) => {
    if (type.startsWith("image/"))
      return <Image className="w-6 h-6 text-blue-500" />;
    if (type.startsWith("video/"))
      return <Video className="w-6 h-6 text-purple-500" />;
    if (type.startsWith("audio/"))
      return <Music className="w-6 h-6 text-green-500" />;
    return <FileText className="w-6 h-6 text-orange-500" />;
  };

  const getMediaCategory = (
    type: string,
  ): "image" | "video" | "audio" | "document" => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    return "document";
  };

  const filteredMedia =
    filter === "all"
      ? mediaItems
      : mediaItems.filter((item) => getMediaCategory(item.type) === filter);

  const handleConfirm = () => {
    if (selectedMedia) {
      onSelect(selectedMedia);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select from Gallery
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 p-4 border-b dark:border-slate-700">
          {(["all", "image", "video", "audio", "document"] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filter === f
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ),
          )}
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <Image className="w-12 h-12 mb-2 opacity-50" />
              <p>No media found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedMedia?.id === item.id
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-transparent hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  {item.type.startsWith("image/") ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center p-2">
                      {getMediaIcon(item.type)}
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center truncate w-full">
                        {item.name}
                      </span>
                    </div>
                  )}

                  {/* Selection Check */}
                  {selectedMedia?.id === item.id && (
                    <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t dark:border-slate-700">
          <div className="text-sm text-gray-500">
            {selectedMedia ? (
              <span>
                Selected: <strong>{selectedMedia.name}</strong> (
                {selectedMedia.size})
              </span>
            ) : (
              <span>Click on a media item to select</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedMedia}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                selectedMedia
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
