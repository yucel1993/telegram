"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { Chat } from "@/lib/models/chat"
import { User } from "@/lib/models/user"
import mongoose from "mongoose"

export async function addReaction({
  userId,
  chatId,
  messageId,
  emoji,
}: {
  userId: string
  chatId: string
  messageId: string
  emoji: string
}) {
  try {
    await connectToDatabase()

    // Find the user to get the username
    const user = await User.findById(userId).select("username")
    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Find the chat and message
    const chat = await Chat.findById(chatId)
    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Find the message
    const message = chat.messages.id(messageId)
    if (!message) {
      return { success: false, error: "Message not found" }
    }

    // Check if the user has already reacted with this emoji
    const existingReaction = message.reactions.find((r: any) => r.userId.toString() === userId && r.emoji === emoji)

    if (existingReaction) {
      // If the user has already reacted with this emoji, remove the reaction
      message.reactions = message.reactions.filter((r: any) => !(r.userId.toString() === userId && r.emoji === emoji))
    } else {
      // Add the reaction
      message.reactions.push({
        emoji,
        userId: new mongoose.Types.ObjectId(userId),
        username: user.username,
      })
    }

    await chat.save()

    return { success: true }
  } catch (error) {
    console.error("Error adding reaction:", error)
    return { success: false, error: "Failed to add reaction" }
  }
}

export async function removeReaction({
  userId,
  chatId,
  messageId,
  emoji,
}: {
  userId: string
  chatId: string
  messageId: string
  emoji: string
}) {
  try {
    await connectToDatabase()

    // Find the chat and message
    const chat = await Chat.findById(chatId)
    if (!chat) {
      return { success: false, error: "Chat not found" }
    }

    // Find the message
    const message = chat.messages.id(messageId)
    if (!message) {
      return { success: false, error: "Message not found" }
    }

    // Remove the reaction
    message.reactions = message.reactions.filter((r: any) => !(r.userId.toString() === userId && r.emoji === emoji))

    await chat.save()

    return { success: true }
  } catch (error) {
    console.error("Error removing reaction:", error)
    return { success: false, error: "Failed to remove reaction" }
  }
}
