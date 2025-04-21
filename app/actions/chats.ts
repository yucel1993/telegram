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
        // Check if it's a group chat
        if (chat.isGroup) {
          // For group chats, return the group name and info
          return {
            _id: chat._id,
            isGroup: true,
            name: chat.name,
            description: chat.description,
            lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null,
            unreadCount: chat.messages.filter((m) => m.sender.toString() !== userId && !m.read).length,
          }
        } else {
          // For direct chats, find the other user
          const otherUserId = chat.participants.find((p) => p.toString() !== userId)
          let otherUser = null

          if (otherUserId) {
            otherUser = await User.findById(otherUserId).select("_id username")
          }

          // Get the last message
          const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null

          // Count unread messages
          const unreadCount = chat.messages.filter((m) => m.sender.toString() !== userId && !m.read).length

          return {
            _id: chat._id,
            isGroup: false,
            otherUser,
            lastMessage,
            unreadCount,
          }
        }
      }),
    )

    return chatData
  } catch (error) {
    console.error("Error getting user chats:", error)
    return []
  }
}

// Update the getChatMessages function to include isGroupMember information
export async function getChatMessages({ userId, chatId }: { userId: string; chatId: string }) {
  try {
    await connectToDatabase()

    // Check if this is a user ID rather than a chat ID (for nearby users)
    if (chatId.length === 24 && /^[0-9a-fA-F]{24}$/.test(chatId)) {
      try {
        // Check if it's a valid chat ID first
        const existingChat = await Chat.findById(chatId)

        if (!existingChat) {
          // It might be a user ID, let's check if a chat exists with these participants
          const existingChatWithUser = await Chat.findOne({
            participants: {
              $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(chatId)],
            },
          })

          if (existingChatWithUser) {
            // Use the existing chat
            chatId = existingChatWithUser._id.toString()
          } else {
            // Create a new chat with these participants
            const newChat = new Chat({
              participants: [userId, chatId],
              messages: [],
            })

            await newChat.save()
            chatId = newChat._id.toString()
          }
        }
      } catch (error) {
        console.error("Error checking chat:", error)
      }
    }

    const chat = await Chat.findById(chatId)

    if (!chat) {
      // If chat still doesn't exist, return empty data
      return { messages: [], otherUser: null }
    }

    // Check if it's a group chat
    if (chat.isGroup) {
      // For group chats, get all participants' info for displaying names
      const participantsInfo = await User.find({
        _id: { $in: chat.participants },
      }).select("_id username")

      // Create a map of user IDs to usernames
      const userMap = new Map()
      participantsInfo.forEach((user) => {
        userMap.set(user._id.toString(), user.username)
      })

      // Add sender names to messages
      const messagesWithSenderNames = chat.messages.map((msg) => {
        const message = msg.toObject ? msg.toObject() : msg

        // If it's a system message, don't modify the sender name
        if (message.isSystemMessage) {
          return message
        }

        // If the sender is the current user, set senderName to "You"
        if (message.sender.toString() === userId) {
          message.senderName = "You"
        } else {
          message.senderName = userMap.get(message.sender.toString()) || "Unknown User"
        }
        return message
      })

      // Check if the current user is a member of the group
      const isGroupMember = chat.participants.some((p) => p.toString() === userId)

      return {
        messages: messagesWithSenderNames,
        isGroup: true,
        name: chat.name,
        description: chat.description,
        participants: participantsInfo,
        admins: chat.admins,
        isGroupMember,
      }
    } else {
      // For direct chats, find the other user
      const otherUserId = chat.participants.find((p) => p.toString() !== userId)
      const otherUser = await User.findById(otherUserId).select("_id username")

      return {
        messages: chat.messages || [],
        otherUser,
        isGroup: false,
        isGroupMember: true, // Always a member in direct chats
      }
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

    // Check if this is a user ID rather than a chat ID (for nearby users)
    if (chatId.length === 24 && /^[0-9a-fA-F]{24}$/.test(chatId)) {
      try {
        // Check if it's a valid chat ID first
        const existingChat = await Chat.findById(chatId)

        if (!existingChat) {
          // It might be a user ID, let's check if a chat exists with these participants
          const existingChatWithUser = await Chat.findOne({
            participants: {
              $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(chatId)],
            },
          })

          if (existingChatWithUser) {
            // Use the existing chat
            chatId = existingChatWithUser._id.toString()
          } else {
            // Create a new chat with these participants
            const newChat = new Chat({
              participants: [userId, chatId],
              messages: [],
            })

            await newChat.save()
            chatId = newChat._id.toString()
          }
        }
      } catch (error) {
        console.error("Error checking chat:", error)
      }
    }

    const chat = await Chat.findById(chatId)

    if (!chat) {
      throw new Error("Chat not found")
    }

    // Add new message
    const newMessage = {
      sender: new mongoose.Types.ObjectId(userId),
      content,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    chat.messages.push(newMessage)
    await chat.save()

    // Update the chat's updatedAt timestamp
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() })

    return { success: true, message: newMessage }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function markMessagesAsRead({ userId, chatId }: { userId: string; chatId: string }) {
  try {
    await connectToDatabase()

    // Check if this is a user ID rather than a chat ID
    if (chatId.length === 24 && /^[0-9a-fA-F]{24}$/.test(chatId)) {
      try {
        // Check if it's a valid chat ID first
        const existingChat = await Chat.findById(chatId)

        if (!existingChat) {
          // It might be a user ID, let's check if a chat exists with these participants
          const existingChatWithUser = await Chat.findOne({
            participants: {
              $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(chatId)],
            },
          })

          if (existingChatWithUser) {
            // Use the existing chat
            chatId = existingChatWithUser._id.toString()
          } else {
            // No chat exists yet, nothing to mark as read
            return { success: true }
          }
        }
      } catch (error) {
        console.error("Error checking chat:", error)
      }
    }

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
