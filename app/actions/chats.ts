"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { Chat } from "@/lib/models/chat"
import { User } from "@/lib/models/user"
import mongoose from "mongoose"

// Update the getUserChats function to include profile and group images
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
          let groupImageUrl = null
          if (chat.groupImage) {
            try {
              // Import dynamically to avoid server-side bundling issues
              const { getFileSignedUrl } = await import("@/lib/s3-utils")
              groupImageUrl = await getFileSignedUrl(chat.groupImage)
            } catch (error) {
              console.error("Error getting group image URL:", error)
            }
          }

          return {
            _id: chat._id,
            isGroup: true,
            name: chat.name,
            description: chat.description,
            groupImage: groupImageUrl,
            lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null,
            unreadCount: chat.messages.filter((m) => m.sender.toString() !== userId && !m.read).length,
          }
        } else {
          // For direct chats, find the other user
          const otherUserId = chat.participants.find((p) => p.toString() !== userId)
          let otherUser = null

          if (otherUserId) {
            otherUser = await User.findById(otherUserId).select("_id username profileImage")

            // If user has a profile image, get the URL
            if (otherUser && otherUser.profileImage) {
              try {
                // Import dynamically to avoid server-side bundling issues
                const { getFileSignedUrl } = await import("@/lib/s3-utils")
                const profileImageUrl = await getFileSignedUrl(otherUser.profileImage)
                otherUser = otherUser.toObject()
                otherUser.profileImage = profileImageUrl
              } catch (error) {
                console.error("Error getting profile image URL:", error)
              }
            }
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
      // For group chats, we need to get ALL possible sender information, not just current participants
      // This ensures we can display names for users who have left the group

      // First, collect all unique sender IDs from messages
      const allSenderIds = new Set<string>()
      chat.messages.forEach((msg) => {
        if (msg.sender) {
          allSenderIds.add(msg.sender.toString())
        }
      })

      // Add current participants to the set as well
      chat.participants.forEach((p) => {
        allSenderIds.add(p.toString())
      })

      // Convert the set to an array
      const senderIdsArray = Array.from(allSenderIds)

      // Get information for all these users
      const usersInfo = await User.find({
        _id: { $in: senderIdsArray.map((id) => new mongoose.Types.ObjectId(id)) },
      }).select("_id username")

      // Create a map of user IDs to usernames
      const userMap = new Map()
      usersInfo.forEach((user) => {
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
        if (message.sender && message.sender.toString() === userId) {
          message.senderName = "You"
        } else if (message.sender) {
          // Look up the sender's username in our map
          const senderUsername = userMap.get(message.sender.toString())
          message.senderName = senderUsername || "Unknown User"
        } else {
          message.senderName = "Unknown User"
        }

        return message
      })

      // Check if the current user is a member of the group
      const isGroupMember = chat.participants.some((p) => p.toString() === userId)

      // Check if the current user is an admin
      const isAdmin = chat.admins.some((a) => a.toString() === userId)

      return {
        messages: messagesWithSenderNames,
        isGroup: true,
        name: chat.name,
        description: chat.description,
        participants: usersInfo.filter((user) => chat.participants.some((p) => p.toString() === user._id.toString())),
        admins: chat.admins,
        isGroupMember,
        isAdmin,
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
  fileAttachment,
}: {
  userId: string
  chatId: string
  content: string
  fileAttachment?: {
    filename: string
    originalFilename: string
    mimeType: string
    size: number
    s3Key: string
    fileType: string
    isVoiceMessage?: boolean
  } | null
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

    // If content is empty and there's a file attachment, use a more descriptive message based on file type
    let messageContent = content
    if (!content && fileAttachment) {
      if (fileAttachment.isVoiceMessage) {
        messageContent = "🎤 Voice message"
      } else {
        switch (fileAttachment.fileType) {
          case "audio":
            messageContent = "🎵 Audio file"
            break
          case "video":
            messageContent = "🎬 Video file"
            break
          case "document":
            messageContent = "📄 Document"
            break
          case "image":
            messageContent = "🖼️ Image"
            break
          default:
            messageContent = "📎 File"
        }
      }
    }

    // Add new message
    const newMessage = {
      sender: new mongoose.Types.ObjectId(userId),
      content: messageContent,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      fileAttachment: fileAttachment || null,
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

// New function to delete a chat for a user
export async function deleteChat({ userId, chatId }: { userId: string; chatId: string }) {
  try {
    await connectToDatabase()

    const chat = await Chat.findById(chatId)

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    if (chat.isGroup) {
      // For group chats, remove the user from participants
      await Chat.findByIdAndUpdate(chatId, {
        $pull: {
          participants: new mongoose.Types.ObjectId(userId),
        },
      })

      // Add a system message about the user leaving
      const user = await User.findById(userId)
      const username = user ? user.username : "A user"

      await Chat.findByIdAndUpdate(
        chatId,
        {
          $push: {
            messages: {
              sender: new mongoose.Types.ObjectId(userId),
              content: `${username} left the group`,
              read: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              isSystemMessage: true,
            },
          },
        },
        { new: true },
      )
    } else {
      // For direct chats, we'll just remove the user from participants
      // This effectively "deletes" the chat for this user while preserving it for the other user
      await Chat.findByIdAndUpdate(chatId, {
        $pull: {
          participants: new mongoose.Types.ObjectId(userId),
        },
      })

      // If no participants are left, delete the chat entirely
      const updatedChat = await Chat.findById(chatId)
      if (updatedChat && updatedChat.participants.length === 0) {
        await Chat.findByIdAndDelete(chatId)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting chat:", error)
    return { success: false, error: "Failed to delete chat" }
  }
}

// Add this function to the chats.ts file

export async function getChatMedia({ userId, chatId }: { userId: string; chatId: string }) {
  try {
    await connectToDatabase()

    const chat = await Chat.findById(chatId)

    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Check if user is a participant
    if (!chat.participants.some((p) => p.toString() === userId)) {
      return { success: false, error: "Not authorized" }
    }

    // Filter messages with file attachments
    const messagesWithFiles = chat.messages.filter((msg) => msg.fileAttachment)

    // Get file details and URLs
    const media = await Promise.all(
      messagesWithFiles.map(async (msg) => {
        const attachment = msg.fileAttachment
        let url = null

        try {
          // Import dynamically to avoid server-side bundling issues
          const { getFileSignedUrl } = await import("@/lib/s3-utils")
          url = await getFileSignedUrl(attachment.s3Key)
        } catch (error) {
          console.error("Error getting file URL:", error)
        }

        return {
          ...attachment,
          url,
          sender: msg.sender,
          createdAt: msg.createdAt,
        }
      }),
    )

    return { success: true, media }
  } catch (error) {
    console.error("Error getting chat media:", error)
    return { success: false, error: "Failed to get media" }
  }
}
