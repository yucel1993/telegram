"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/user"
import { Chat } from "@/lib/models/chat"
import mongoose from "mongoose"
import { getFileSignedUrl } from "@/lib/s3-utils"

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
      lastActive: new Date(),
      isOnline: true,
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
      lastActive: new Date(),
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
          profileImage: 1,
        },
      },
      {
        $limit: 50,
      },
    ])

    // Process profile images
    const usersWithImages = await Promise.all(
      nearbyUsers.map(async (user) => {
        if (user.profileImage) {
          try {
            user.profileImage = await getFileSignedUrl(user.profileImage)
          } catch (error) {
            console.error("Error getting profile image URL:", error)
            user.profileImage = null
          }
        }
        return user
      }),
    )

    return usersWithImages
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
      .select("_id username lastActive profileImage")
      .limit(20)

    // Process profile images
    const usersWithImages = await Promise.all(
      users.map(async (user) => {
        const userData = user.toObject()
        if (userData.profileImage) {
          try {
            userData.profileImage = await getFileSignedUrl(userData.profileImage)
          } catch (error) {
            console.error("Error getting profile image URL:", error)
            userData.profileImage = null
          }
        }
        return userData
      }),
    )

    return usersWithImages
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

// Add this new function to search for both users and groups
export async function searchUsersAndGroups({
  userId,
  query,
}: {
  userId: string
  query: string
}) {
  try {
    await connectToDatabase()

    // Make sure query is not empty
    if (!query.trim()) {
      return { users: [], groups: [] }
    }

    // Create a case-insensitive regex for the search
    const searchRegex = { $regex: query, $options: "i" }

    // Search for users
    const users = await User.find({
      _id: { $ne: userId },
      username: searchRegex,
    })
      .select("_id username lastActive profileImage")
      .limit(3)

    // Process user profile images
    const usersWithImages = await Promise.all(
      users.map(async (user) => {
        const userData = user.toObject()
        if (userData.profileImage) {
          try {
            userData.profileImage = await getFileSignedUrl(userData.profileImage)
          } catch (error) {
            console.error("Error getting profile image URL:", error)
            userData.profileImage = null
          }
        }
        return userData
      }),
    )

    // Search for all groups (not just nearby ones)
    const groups = await Chat.find({
      isGroup: true,
      $or: [{ name: searchRegex }, { description: searchRegex }],
    })
      .select("_id name description participants groupImage")
      .limit(3)

    // Process group images and format results
    const formattedGroups = await Promise.all(
      groups.map(async (group) => {
        const groupData = {
          _id: group._id,
          name: group.name,
          description: group.description,
          participantsCount: group.participants.length,
          isGroup: true,
          groupImage: null as string | null,
        }

        if (group.groupImage) {
          try {
            groupData.groupImage = await getFileSignedUrl(group.groupImage)
          } catch (error) {
            console.error("Error getting group image URL:", error)
          }
        }

        return groupData
      }),
    )

    return {
      users: usersWithImages,
      groups: formattedGroups,
    }
  } catch (error) {
    console.error("Error searching users and groups:", error)
    return { users: [], groups: [] }
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

export async function getUserProfile({ userId }: { userId: string }) {
  try {
    await connectToDatabase()

    const user = await User.findById(userId).select("username email profileImage nativeLanguage targetLanguage")

    if (!user) {
      return null
    }

    // If user has a profile image, get the URL
    let profileImageUrl = null
    if (user.profileImage) {
      try {
        profileImageUrl = await getFileSignedUrl(user.profileImage)
      } catch (error) {
        console.error("Error getting profile image URL:", error)
      }
    }

    return {
      username: user.username,
      email: user.email,
      profileImage: profileImageUrl,
      nativeLanguage: user.nativeLanguage,
      targetLanguage: user.targetLanguage,
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

export async function updateUserProfile({
  userId,
  profileImage,
  nativeLanguage,
  targetLanguage,
}: {
  userId: string
  profileImage?: string | null
  nativeLanguage?: string | null
  targetLanguage?: string | null
}) {
  try {
    await connectToDatabase()

    const updateData: any = {}
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage
    }
    if (nativeLanguage !== undefined) {
      updateData.nativeLanguage = nativeLanguage
    }
    if (targetLanguage !== undefined) {
      updateData.targetLanguage = targetLanguage
    }

    // Update last active time
    updateData.lastActive = new Date()

    await User.findByIdAndUpdate(userId, { $set: updateData })

    return { success: true }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { success: false, error: "Failed to update profile" }
  }
}

// New function to get language buddies
export async function getLanguageBuddies({
  userId,
  distance = 10000, // Default 10km
}: {
  userId: string
  distance?: number
}) {
  try {
    await connectToDatabase()

    // Get the user's profile to check language preferences
    const user = await User.findById(userId).select("nativeLanguage targetLanguage location")

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Check if user has set language preferences
    if (!user.targetLanguage) {
      return {
        success: false,
        error: "Please set your target language in profile settings",
        userLanguages: {
          nativeLanguage: user.nativeLanguage,
          targetLanguage: user.targetLanguage,
        },
      }
    }

    // Check if user has location enabled
    if (!user.location?.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
      return {
        success: false,
        error: "Please enable location to find language buddies nearby",
        userLanguages: {
          nativeLanguage: user.nativeLanguage,
          targetLanguage: user.targetLanguage,
        },
      }
    }

    // Find users who speak the target language
    const languageBuddies = await User.aggregate([
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
          // Match users who speak the target language
          nativeLanguage: user.targetLanguage,
        },
      },
      {
        $sort: {
          lastActive: -1, // Sort by most recently active
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          distance: 1,
          lastActive: 1,
          nativeLanguage: 1,
          targetLanguage: 1,
          profileImage: 1,
          isOnline: 1,
        },
      },
      {
        $limit: 50,
      },
    ])

    // Process profile images
    const buddiesWithImages = await Promise.all(
      languageBuddies.map(async (buddy) => {
        if (buddy.profileImage) {
          try {
            buddy.profileImage = await getFileSignedUrl(buddy.profileImage)
          } catch (error) {
            console.error("Error getting profile image URL:", error)
            buddy.profileImage = null
          }
        }
        return buddy
      }),
    )

    return {
      success: true,
      buddies: buddiesWithImages,
      userLanguages: {
        nativeLanguage: user.nativeLanguage,
        targetLanguage: user.targetLanguage,
      },
    }
  } catch (error) {
    console.error("Error finding language buddies:", error)
    return { success: false, error: "Failed to find language buddies" }
  }
}

// Function to update user online status
export async function updateUserOnlineStatus({
  userId,
  isOnline,
}: {
  userId: string
  isOnline: boolean
}) {
  try {
    await connectToDatabase()

    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastActive: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating online status:", error)
    return { success: false, error: "Failed to update online status" }
  }
}

// Function to get user online status
export async function getUserOnlineStatus({ userId }: { userId: string }) {
  try {
    await connectToDatabase()

    const user = await User.findById(userId).select("isOnline lastActive")

    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      isOnline: user.isOnline,
      lastActive: user.lastActive,
    }
  } catch (error) {
    console.error("Error getting online status:", error)
    return { success: false, error: "Failed to get online status" }
  }
}
