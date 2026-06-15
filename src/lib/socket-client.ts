import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let hasShownConnectWarning = false;

export function getSocket(): Socket {
  if (!socket) {
    // In production, connect to same origin. In dev, use localhost:3000
    const url =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 1,
      reconnectionDelay: 2000,
      timeout: 6000,
    });

    socket.on("connect", () => {
      hasShownConnectWarning = false;
      console.log("🟢 Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      if (!hasShownConnectWarning) {
        hasShownConnectWarning = true;
        console.warn(
          "⚠️ Socket unavailable in current dev run (real-time updates disabled):",
          error.message,
        );
      }
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
