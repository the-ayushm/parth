/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Send, Bot, X, Loader2 } from "lucide-react";
import { ngrokAxiosInstance } from "@/lib/axiosInstance";

interface FAQMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface FAQBot {
  id: number;
  name: string;
  faqBotId: string;
}

interface FAQFlowProps {
  contactId: number;
  contactName: string;
  onClose?: () => void;
  botId?: string;
}

export default function FAQFlow({
  contactId,
  contactName,
  onClose,
  botId,
}: FAQFlowProps) {
  const [messages, setMessages] = useState<FAQMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bots, setBots] = useState<FAQBot[]>([]);
  const [selectedBot, setSelectedBot] = useState<FAQBot | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false);

  // Fetch available FAQ bots
  useEffect(() => {
    const fetchBots = async () => {
      try {
        const res = await ngrokAxiosInstance.get("/api/user/chatbot-faq");
        const data = await res.data;
        setBots(data || []);

        // If botId is provided, select that bot
        if (botId && data.length > 0) {
          const bot = data.find((b: FAQBot) => b.faqBotId === botId);
          if (bot) {
            setSelectedBot(bot);
            startFAQFlow(bot);
          }
        }
      } catch (error) {
        console.error("Failed to fetch FAQ bots:", error);
      }
    };

    fetchBots();
  }, [botId]);

  const startFAQFlow = async (bot: FAQBot) => {
    setSelectedBot(bot);
    setFlowStarted(true);
    setMessages([]);

    // Add initial bot message
    const initialMessage: FAQMessage = {
      id: "1",
      text: `Hello! I'm ${bot.name}. I'm here to help you. Let me ask you a few questions to better assist you.`,
      isBot: true,
      timestamp: new Date(),
    };

    setMessages([initialMessage]);

    // Simulate FAQ flow - in real scenario this would come from database
    setTimeout(() => {
      const faqMessage: FAQMessage = {
        id: "2",
        text: "What is your main concern today?",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, faqMessage]);
    }, 1500);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !selectedBot) return;

    // Add user message
    const newUserMessage: FAQMessage = {
      id: Date.now().toString(),
      text: userInput,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setLoading(true);

    // Simulate bot response delay
    setTimeout(() => {
      const botResponses = [
        "Thank you for that information. Can you provide more details?",
        "I understand. Let me ask you one more question.",
        "That's helpful! Do you have any other concerns?",
        "I've gathered all the information I need. A representative will contact you shortly. Thank you for your patience!",
      ];

      const randomResponse =
        botResponses[Math.floor(Math.random() * botResponses.length)];

      const botMessage: FAQMessage = {
        id: (Date.now() + 1).toString(),
        text: randomResponse.includes("representative")
          ? randomResponse
          : randomResponse,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setLoading(false);

      // If final message, show close option
      if (randomResponse.includes("representative")) {
        setTimeout(() => {
          const endMessage: FAQMessage = {
            id: (Date.now() + 2).toString(),
            text: "📞 We will contact you shortly. Please keep your phone available.",
            isBot: true,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, endMessage]);
        }, 1000);
      }
    }, 1200);
  };

  if (!selectedBot && bots.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          No FAQ Bots available. Create one in the{" "}
          <strong>Chatbot FAQ Manager</strong> first.
        </p>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center gap-2"
      >
        <Bot size={20} />
        <span className="hidden sm:inline">FAQ Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <div>
            <h3 className="font-semibold">
              {selectedBot?.name || "FAQ Assistant"}
            </h3>
            <p className="text-xs text-blue-100">Automated Support</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-blue-400 rounded transition"
          >
            <MessageCircle size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-400 rounded transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Bot Selection (if not started) */}
      {!flowStarted && bots.length > 0 && (
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Select FAQ Bot:
          </p>
          <div className="space-y-2">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => startFAQFlow(bot)}
                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
              >
                <p className="font-medium text-sm text-gray-900">{bot.name}</p>
                <p className="text-xs text-gray-500">ID: {bot.faqBotId}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.isBot
                  ? "bg-blue-100 text-blue-900 rounded-bl-none"
                  : "bg-indigo-600 text-white rounded-br-none"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className="text-xs mt-1 opacity-70">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg rounded-bl-none">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {flowStarted && (
        <div className="border-t p-3 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your response..."
              disabled={loading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || loading}
              className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
