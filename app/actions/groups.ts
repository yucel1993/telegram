"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/user"
import { Chat } from "@/lib/models/chat"
import mongoose from "mongoose"

export async function searchUsers({
  userId,
  query,
}: {
  userId: string
  query: string
}) {
  try {
    await connectToDatabase()

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: query, $options: "i" },
    })
      .select("_id username lastActive")
      .limit(20)

    return users
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

export async function createGroup({
  userId,
  name,
  description,
  participants,
}: {
  userId: string
  name: string
  description?: string
  participants: string[]
}) {
  try {
    await connectToDatabase()

    // Ensure the creator is included in participants
    if (!participants.includes(userId)) {
      participants.push(userId)
    }

    // Create new group chat
    const newGroup = new Chat({
      isGroup: true,
      name,
      description: description || null,
      participants: participants.map((id) => new mongoose.Types.ObjectId(id)),
      admins: [new mongoose.Types.ObjectId(userId)], // Creator is the admin
      messages: [],
    })

    await newGroup.save()

    return {
      success: true,
      chatId: newGroup._id.toString(),
    }
  } catch (error) {
    console.error("Error creating group:", error)
    return {
      success: false,
      error: "Failed to create group",
    }
  }
}

export async function createGroupWithLocation({
  userId,
  name,
  description,
  participants,
  location,
}: {
  userId: string
  name: string
  description?: string
  participants: string[]
  location?: { latitude: number; longitude: number } | null
}) {
  try {
    await connectToDatabase()

    // Ensure the creator is included in participants
    if (!participants.includes(userId)) {
      participants.push(userId)
    }

    // Create new group chat
    const newGroup = new Chat({
      isGroup: true,
      name,
      description: description || null,
      participants: participants.map((id) => new mongoose.Types.ObjectId(id)),
      admins: [new mongoose.Types.ObjectId(userId)], // Creator is the admin
      messages: [],
    })

    // Add location if provided
    if (location) {
      newGroup.location = {
        type: "Point",
        coordinates: [location.longitude, location.latitude], // MongoDB uses [longitude, latitude]
        lastUpdated: new Date(),
      }
    }

    await newGroup.save()

    return {
      success: true,
      chatId: newGroup._id.toString(),
    }
  } catch (error) {
    console.error("Error creating group:", error)
    return {
      success: false,
      error: "Failed to create group",
    }
  }
}

export async function getNearbyGroups({
  userId,
  distance = 1000,
}: {
  userId: string
  distance?: number
}) {
  try {
    await connectToDatabase()

    // Get the user's location
    const user = await User.findById(userId)

    if (!user?.location?.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
      return []
    }

    // Find nearby groups
    const nearbyGroups = await Chat.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: user.location.coordinates,
          },
          distanceField: "distance",
          maxDistance: distance, // in meters
          spherical: true,
          query: { isGroup: true }, // Only find groups
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          distance: 1,
          participantsCount: { $size: "$participants" },
        },
      },
      {
        $limit: 20,
      },
    ])

    return nearbyGroups
  } catch (error) {
    console.error("Error finding nearby groups:", error)
    return []
  }
}

export async function addGroupMembers({
  userId,
  chatId,
  newMembers,
}: {
  userId: string
  chatId: string
  newMembers: string[]
}) {
  try {
    await connectToDatabase()

    // Check if user is admin
    const chat = await Chat.findById(chatId)

    if (!chat) {
      return { success: false, error: "Group not found" }
    }

    if (!chat.isGroup) {
      return { success: false, error: "This is not a group chat" }
    }

    if (!chat.admins.some((admin) => admin.toString() === userId)) {
      return { success: false, error: "Only admins can add members" }
    }

    // Add new members
    await Chat.findByIdAndUpdate(chatId, {
      $addToSet: {
        participants: {
          $each: newMembers.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error adding group members:", error)
    return { success: false, error: "Failed to add members" }
  }
}

export async function removeGroupMember({
  userId,
  chatId,
  memberToRemove,
}: {
  userId: string
  chatId: string
  memberToRemove: string
}) {
  try {
    await connectToDatabase()

    // Check if user is admin
    const chat = await Chat.findById(chatId)

    if (!chat) {
      return { success: false, error: "Group not found" }
    }

    if (!chat.isGroup) {
      return { success: false, error: "This is not a group chat" }
    }

    // Allow users to remove themselves or admins to remove others
    const isAdmin = chat.admins.some((admin) => admin.toString() === userId)
    const isSelfRemoval = userId === memberToRemove

    if (!isAdmin && !isSelfRemoval) {
      return { success: false, error: "Only admins can remove other members" }
    }

    // Remove member
    await Chat.findByIdAndUpdate(chatId, {
      $pull: {
        participants: new mongoose.Types.ObjectId(memberToRemove),
        admins: new mongoose.Types.ObjectId(memberToRemove),
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error removing group member:", error)
    return { success: false, error: "Failed to remove member" }
  }
}

export async function updateGroupInfo({
  userId,
  chatId,
  name,
  description,
}: {
  userId: string
  chatId: string
  name?: string
  description?: string
}) {
  try {
    await connectToDatabase()

    // Check if user is admin
    const chat = await Chat.findById(chatId)

    if (!chat) {
      return { success: false, error: "Group not found" }
    }

    if (!chat.isGroup) {
      return { success: false, error: "This is not a group chat" }
    }

    if (!chat.admins.some((admin) => admin.toString() === userId)) {
      return { success: false, error: "Only admins can update group info" }
    }

    // Update fields
    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description

    await Chat.findByIdAndUpdate(chatId, { $set: updateData })

    return { success: true }
  } catch (error) {
    console.error("Error updating group info:", error)
    return { success: false, error: "Failed to update group info" }
  }
}
