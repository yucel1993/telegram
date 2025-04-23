"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { Event } from "@/lib/models/event"
import { User } from "@/lib/models/user"
import mongoose from "mongoose"

// Create a new event
export async function createEvent({
  userId,
  name,
  description,
  city,
  address,
  dateTime,
  fee,
  participantLimit,
  image,
  isPrivate,
}: {
  userId: string
  name: string
  description?: string
  city: string
  address: string
  dateTime: string
  fee?: number | null
  participantLimit?: number
  image?: string
  isPrivate?: boolean
}) {
  try {
    await connectToDatabase()

    const newEvent = new Event({
      name,
      description: description || "",
      city: city.toLowerCase(),
      address,
      dateTime: new Date(dateTime),
      fee: fee === undefined ? null : fee,
      participantLimit: participantLimit || 0,
      image: image || null,
      isPrivate: isPrivate || false,
      admin: new mongoose.Types.ObjectId(userId),
      registeredUsers: [],
    })

    await newEvent.save()

    // Add event to user's adminEvents
    await User.findByIdAndUpdate(userId, {
      $push: { adminEvents: newEvent._id },
    })

    return { success: true, eventId: newEvent._id.toString() }
  } catch (error) {
    console.error("Error creating event:", error)
    return { success: false, error: "Failed to create event" }
  }
}

// Find events by city
export async function findEventsByCity({
  city,
  userId,
}: {
  city: string
  userId: string
}) {
  try {
    await connectToDatabase()

    // Find public events in the specified city
    const events = await Event.find({
      city: city.toLowerCase(),
      isPrivate: false,
      dateTime: { $gte: new Date() }, // Only show upcoming events
    })
      .select("_id name description dateTime fee participantLimit registeredUsers admin")
      .sort({ dateTime: 1 }) // Sort by date, upcoming first
      .populate("admin", "username")

    // Format events with additional info
    const formattedEvents = events.map((event) => {
      const isAdmin = event.admin._id.toString() === userId
      const isRegistered = event.registeredUsers.some((user: any) => user.userId.toString() === userId)
      const isFull = event.participantLimit > 0 && event.registeredUsers.length >= event.participantLimit

      return {
        ...event.toObject(),
        isAdmin,
        isRegistered,
        isFull,
        participantCount: event.registeredUsers.length,
      }
    })

    return formattedEvents
  } catch (error) {
    console.error("Error finding events by city:", error)
    return []
  }
}

// Get event details
export async function getEventDetails({
  eventId,
  userId,
}: {
  eventId: string
  userId: string
}) {
  try {
    await connectToDatabase()

    const event = await Event.findById(eventId).populate("admin", "username")

    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user is admin or if event is public
    const isAdmin = event.admin._id.toString() === userId
    const isRegistered = event.registeredUsers.some((user: any) => user.userId.toString() === userId)
    const isFull = event.participantLimit > 0 && event.registeredUsers.length >= event.participantLimit

    // If event is private and user is not admin or registered, deny access
    if (event.isPrivate && !isAdmin && !isRegistered) {
      return { success: false, error: "You don't have permission to view this event" }
    }

    return {
      success: true,
      event: {
        ...event.toObject(),
        isAdmin,
        isRegistered,
        isFull,
        participantCount: event.registeredUsers.length,
      },
    }
  } catch (error) {
    console.error("Error getting event details:", error)
    return { success: false, error: "Failed to get event details" }
  }
}

// Register for an event
export async function registerForEvent({
  userId,
  eventId,
  name,
  email,
}: {
  userId: string
  eventId: string
  name: string
  email: string
}) {
  try {
    await connectToDatabase()

    const event = await Event.findById(eventId)

    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user is already registered
    if (event.registeredUsers.some((user: any) => user.userId.toString() === userId)) {
      return { success: false, error: "You are already registered for this event" }
    }

    // Check if event is full
    if (event.participantLimit > 0 && event.registeredUsers.length >= event.participantLimit) {
      return { success: false, error: "This event is full" }
    }

    // Add user to event's registeredUsers
    await Event.findByIdAndUpdate(eventId, {
      $push: {
        registeredUsers: {
          userId: new mongoose.Types.ObjectId(userId),
          name,
          email,
          registeredAt: new Date(),
        },
      },
    })

    // Add event to user's registeredEvents
    await User.findByIdAndUpdate(userId, {
      $push: { registeredEvents: new mongoose.Types.ObjectId(eventId) },
    })

    return { success: true }
  } catch (error) {
    console.error("Error registering for event:", error)
    return { success: false, error: "Failed to register for event" }
  }
}

// Unregister from an event
export async function unregisterFromEvent({
  userId,
  eventId,
}: {
  userId: string
  eventId: string
}) {
  try {
    await connectToDatabase()

    // Remove user from event's registeredUsers
    await Event.findByIdAndUpdate(eventId, {
      $pull: {
        registeredUsers: { userId: new mongoose.Types.ObjectId(userId) },
      },
    })

    // Remove event from user's registeredEvents
    await User.findByIdAndUpdate(userId, {
      $pull: { registeredEvents: new mongoose.Types.ObjectId(eventId) },
    })

    return { success: true }
  } catch (error) {
    console.error("Error unregistering from event:", error)
    return { success: false, error: "Failed to unregister from event" }
  }
}

// Get user's registered events
export async function getUserRegisteredEvents({ userId }: { userId: string }) {
  try {
    await connectToDatabase()

    // Find events where the user is registered
    const events = await Event.find({
      "registeredUsers.userId": new mongoose.Types.ObjectId(userId),
    })
      .select("_id name description dateTime fee address city registeredUsers admin")
      .sort({ dateTime: 1 })
      .populate("admin", "username")

    return events.map((event) => ({
      ...event.toObject(),
      participantCount: event.registeredUsers.length,
      adminName: event.admin.username,
    }))
  } catch (error) {
    console.error("Error getting user registered events:", error)
    return []
  }
}

// Get user's admin events
export async function getUserAdminEvents({ userId }: { userId: string }) {
  try {
    await connectToDatabase()

    // Find events where the user is the admin
    const events = await Event.find({
      admin: new mongoose.Types.ObjectId(userId),
    })
      .select("_id name description dateTime fee address city registeredUsers")
      .sort({ dateTime: 1 })

    return events.map((event) => ({
      ...event.toObject(),
      participantCount: event.registeredUsers.length,
    }))
  } catch (error) {
    console.error("Error getting user admin events:", error)
    return []
  }
}

// Update an event
export async function updateEvent({
  userId,
  eventId,
  name,
  description,
  city,
  address,
  dateTime,
  fee,
  participantLimit,
  image,
  isPrivate,
}: {
  userId: string
  eventId: string
  name?: string
  description?: string
  city?: string
  address?: string
  dateTime?: string
  fee?: number | null
  participantLimit?: number
  image?: string
  isPrivate?: boolean
}) {
  try {
    await connectToDatabase()

    // Check if user is the admin of the event
    const event = await Event.findById(eventId)

    if (!event) {
      return { success: false, error: "Event not found" }
    }

    if (event.admin.toString() !== userId) {
      return { success: false, error: "You don't have permission to update this event" }
    }

    // Update event fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (city !== undefined) updateData.city = city.toLowerCase()
    if (address !== undefined) updateData.address = address
    if (dateTime !== undefined) updateData.dateTime = new Date(dateTime)
    if (fee !== undefined) updateData.fee = fee
    if (participantLimit !== undefined) updateData.participantLimit = participantLimit
    if (image !== undefined) updateData.image = image
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate

    await Event.findByIdAndUpdate(eventId, { $set: updateData })

    return { success: true }
  } catch (error) {
    console.error("Error updating event:", error)
    return { success: false, error: "Failed to update event" }
  }
}

// Delete an event
export async function deleteEvent({
  userId,
  eventId,
}: {
  userId: string
  eventId: string
}) {
  try {
    await connectToDatabase()

    // Check if user is the admin of the event
    const event = await Event.findById(eventId)

    if (!event) {
      return { success: false, error: "Event not found" }
    }

    if (event.admin.toString() !== userId) {
      return { success: false, error: "You don't have permission to delete this event" }
    }

    // Get all registered users
    const registeredUserIds = event.registeredUsers.map((user: any) => user.userId)

    // Remove event from all registered users' registeredEvents
    await User.updateMany(
      { _id: { $in: registeredUserIds } },
      { $pull: { registeredEvents: new mongoose.Types.ObjectId(eventId) } },
    )

    // Remove event from admin's adminEvents
    await User.findByIdAndUpdate(userId, {
      $pull: { adminEvents: new mongoose.Types.ObjectId(eventId) },
    })

    // Delete the event
    await Event.findByIdAndDelete(eventId)

    return { success: true }
  } catch (error) {
    console.error("Error deleting event:", error)
    return { success: false, error: "Failed to delete event" }
  }
}
