"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/user"
import { Chat } from "@/lib/models/chat"
import mongoose from "mongoose"

export async function updateUserLocation({
  userId,
  latitude,
  longitude,
}: {
  userId: string
  latitude: number
  longitude: number
}) {
  try {
    await connectToDatabase()

    await User.findByIdAndUpdate(userId, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // MongoDB uses [longitude, latitude]
        lastUpdated: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating location:", error)
    return { success: false, error: "Failed to update location" }
  }
}

export async function disableLocation({ userId }: { userId: string }) {
  try {
    await connectToDatabase()

    await User.findByIdAndUpdate(userId, {
      location: {
        type: "Point",
        coordinates: [0, 0], // Reset coordinates to 0,0
        lastUpdated: null,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error disabling location:", error)
    return { success: false, error: "Failed to disable location" }
  }
}

export async function getNearbyUsers({
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

    // Find nearby users
    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: user.location.coordinates,
          },
          distanceField: "distance",
          maxDistance: distance, // in meters
          spherical: true,
        },
      },
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(userId) },
          // Only include users with valid locations (not 0,0)
          "location.coordinates.0": { $ne: 0 },
          "location.coordinates.1": { $ne: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          distance: 1,
          lastActive: 1,
        },
      },
      {
        $limit: 50,
      },
    ])

    return nearbyUsers
  } catch (error) {
    console.error("Error finding nearby users:", error)
    return []
  }
}

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

export async function createChat({
  userId,
  otherUserId,
}: {
  userId: string
  otherUserId: string
}) {
  try {
    await connectToDatabase()

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: {
        $all: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(otherUserId)],
      },
    })

    if (existingChat) {
      return existingChat._id.toString()
    }

    // Create new chat
    const newChat = new Chat({
      participants: [userId, otherUserId],
      messages: [],
    })

    await newChat.save()

    return newChat._id.toString()
  } catch (error) {
    console.error("Error creating chat:", error)
    return null
  }
}
