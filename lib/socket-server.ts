import type { Server as NetServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import type { NextApiRequest } from "next"
import type { NextApiResponse } from "next"

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function createSocketServer(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("Setting up Socket.io server...")

    // Create a new Socket.io server
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    // Store the Socket.io server instance
    res.socket.server.io = io

    // Set up event handlers
    io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      // Join user to their own room for private messages
      socket.on("join", (userId) => {
        socket.join(userId)
        console.log(`User ${userId} joined their room`)
      })

      // Handle new messages
      socket.on("send-message", async (data) => {
        const { chatId, message, senderId, recipientId } = data

        // Emit to recipient
        if (recipientId) {
          io.to(recipientId).emit("new-message", {
            chatId,
            message,
            senderId,
          })
        }

        // Also emit to sender for consistency
        socket.emit("message-sent", {
          chatId,
          messageId: message._id,
        })
      })

      // Handle typing indicators
      socket.on("typing", (data) => {
        const { chatId, userId, isTyping, recipientId } = data

        if (recipientId) {
          io.to(recipientId).emit("user-typing", {
            chatId,
            userId,
            isTyping,
          })
        }
      })

      // Handle read receipts
      socket.on("mark-read", (data) => {
        const { chatId, userId, recipientId } = data

        if (recipientId) {
          io.to(recipientId).emit("messages-read", {
            chatId,
            userId,
          })
        }
      })

      // Handle user going online/offline
      socket.on("set-status", (data) => {
        const { userId, status } = data

        // Broadcast to all connected clients
        socket.broadcast.emit("user-status", {
          userId,
          status,
        })
      })

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`)
      })
    })
  }

  return res.socket.server.io
}
