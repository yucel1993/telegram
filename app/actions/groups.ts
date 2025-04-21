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

    // Create group data object
    const groupData: any = {
      isGroup: true,
      name,
      description: description || null,
      participants: participants.map((id) => new mongoose.Types.ObjectId(id)),
      admins: [new mongoose.Types.ObjectId(userId)], // Creator is the admin
      messages: [],
    }

    // Add location if provided
    if (location && location.latitude && location.longitude) {
      console.log("Adding location to group:", location)

      // Add location in GeoJSON format
      groupData.location = {
        type: "Point",
        coordinates: [location.longitude, location.latitude], // MongoDB uses [longitude, latitude]
      }
    }

    // Create and save the group
    const newGroup = new Chat(groupData)

    // Log the group data before saving
    console.log("Saving group with data:", JSON.stringify(groupData, null, 2))

    await newGroup.save()

    // Verify the saved group has location data
    const savedGroup = await Chat.findById(newGroup._id)
    console.log("Saved group location:", savedGroup?.location)

    return {
      success: true,
      chatId: newGroup._id.toString(),
    }
  } catch (error) {
    console.error("Error creating group with location:", error)
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
      console.log("User has no valid location")
      return []
    }

    console.log("User location coordinates:", user.location.coordinates)

    // First, let's check if there are any groups with location data
    const groupsWithLocation = await Chat.find({
      isGroup: true,
      "location.type": "Point",
      "location.coordinates": { $exists: true, $ne: null },
    }).limit(5)

    console.log(`Found ${groupsWithLocation.length} groups with location data`)

    if (groupsWithLocation.length > 0) {
      console.log("Sample group location:", groupsWithLocation[0].location)
    }

    // Try a simpler approach first - find all groups and calculate distance manually
    try {
      const allGroups = await Chat.find({
        isGroup: true,
        "location.type": "Point",
        "location.coordinates": { $exists: true, $ne: null },
      })

      console.log(`Found ${allGroups.length} total groups with location`)

      // Filter and calculate distance manually
      const nearbyGroups = allGroups
        .filter((group) => {
          if (!group.location?.coordinates || group.location.coordinates.length !== 2) {
            return false
          }

          // Calculate rough distance (this is not as accurate as MongoDB's $geoNear but works for testing)
          const [groupLng, groupLat] = group.location.coordinates
          const [userLng, userLat] = user.location.coordinates

          // Simple distance calculation (not accurate for large distances but OK for nearby)
          const latDiff = Math.abs(groupLat - userLat) * 111000 // rough meters per degree latitude
          const lngDiff = Math.abs(groupLng - userLng) * 111000 * Math.cos((userLat * Math.PI) / 180)
          const roughDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)

          return roughDistance <= distance
        })
        .map((group) => {
          // Calculate distance
          const [groupLng, groupLat] = group.location.coordinates
          const [userLng, userLat] = user.location.coordinates

          const latDiff = Math.abs(groupLat - userLat) * 111000
          const lngDiff = Math.abs(groupLng - userLng) * 111000 * Math.cos((userLat * Math.PI) / 180)
          const roughDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)

          return {
            _id: group._id,
            name: group.name,
            description: group.description,
            distance: roughDistance,
            participantsCount: group.participants.length,
            location: group.location,
          }
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)

      console.log(`Found ${nearbyGroups.length} nearby groups using manual calculation`)

      if (nearbyGroups.length > 0) {
        return nearbyGroups
      }
    } catch (error) {
      console.error("Error with manual nearby calculation:", error)
    }

    // If manual calculation didn't work or found no groups, try the geospatial query
    try {
      console.log("Trying geospatial query with user coordinates:", user.location.coordinates)

      const nearbyGroups = await Chat.aggregate([
        {
          $match: {
            isGroup: true,
            "location.type": "Point",
            "location.coordinates": { $exists: true, $ne: null },
          },
        },
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: user.location.coordinates,
            },
            distanceField: "distance",
            maxDistance: distance,
            spherical: true,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            distance: 1,
            participantsCount: { $size: "$participants" },
            location: 1,
          },
        },
        {
          $limit: 20,
        },
      ])

      console.log(`Found ${nearbyGroups.length} nearby groups using $geoNear`)
      return nearbyGroups
    } catch (error) {
      console.error("Error with geospatial query:", error)
    }

    // If all else fails, return an empty array
    return []
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
