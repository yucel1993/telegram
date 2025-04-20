"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { Chat } from "@/lib/models/chat"
import { User } from "@/lib/models/user"
import mongoose from "mongoose"

export async function getUserChats({ userId }: { userId: string }) {
  try {
    await connectToDatabase()

    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: new mongoose.Types.ObjectId(userId),
    }).sort({ updatedAt: -1 })

    // Get the last message and other user for each chat
    const chatData = await Promise.all(
      chats.map(async (chat) => {
        // Find the other user in the chat
        const otherUserId = chat.participants.find((p) => p.toString() !== userId)

        const otherUser = await User.findById(otherUserId).select("_id username")

        // Get the last message
        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null

        // Count unread messages
        const unreadCount = chat.messages.filter((m) => m.sender.toString() !== userId && !m.read).length

        return {
          _id: chat._id,
          otherUser,
          lastMessage,
          unreadCount,
        }
      }),
    )

    return chatData
  } catch (error) {
    console.error("Error getting user chats:", error)
    return []
  }
}

export async function getChatMessages({
  userId,
  chatId,
}: {
  userId: string
  chatId: string
}) {
  try {
    await connectToDatabase()

    const chat = await Chat.findById(chatId)

    if (!chat) {
      throw new Error("Chat not found")
    }

    // Find the other user in the chat
    const otherUserId = chat.participants.find((p) => p.toString() !== userId)

    const otherUser = await User.findById(otherUserId).select("_id username")

    return {
      messages: chat.messages,
      otherUser,
    }
  } catch (error) {
    console.error("Error getting chat messages:", error)
    return { messages: [], otherUser: null }
  }
}

export async function sendMessage({
  userId,
  chatId,
  content,
}: {
  userId: string
  chatId: string
  content: string
}) {
  try {
    await connectToDatabase()

    const chat = await Chat.findById(chatId)

    if (!chat) {
      throw new Error("Chat not found")
    }

    // Add new message
    chat.messages.push({
      sender: userId,
      content,
      read: false,
    })

    await chat.save()

    return { success: true }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function markMessagesAsRead({
  userId,
  chatId,
}: {
  userId: string
  chatId: string
}) {
  try {
    await connectToDatabase()

    await Chat.updateOne(
      { _id: chatId },
      {
        $set: {
          "messages.$[elem].read": true,
        },
      },
      {
        arrayFilters: [{ "elem.sender": { $ne: userId }, "elem.read": false }],
      },
    )

    return { success: true }
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return { success: false, error: "Failed to mark messages as read" }
  }
}
