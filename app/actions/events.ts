"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/user"
import { Event } from "@/lib/models/event"
import type mongoose from "mongoose"

// Create a new event
export async function createEvent(data: {
  userId: string
  name: string
  description: string
  city: string
  address: string
  dateTime: string
  fee: number | null
  participantLimit: number
  image?: string
  isPrivate: boolean
}) {
  try {
    await connectToDatabase()

    const user = await User.findById(data.userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const newEvent = new Event({
      name: data.name,
      description: data.description,
      city: data.city,
      address: data.address,
      dateTime: new Date(data.dateTime),
      fee: data.fee,
      participantLimit: data.participantLimit,
      image: data.image || null,
      isPrivate: data.isPrivate,
      admin: data.userId,
      registeredUsers: [],
    })

    await newEvent.save()

    // Add event to user's adminEvents
    user.adminEvents.push(newEvent._id)
    await user.save()

    return { success: true, eventId: newEvent._id }
  } catch (error) {
    console.error("Create event error:", error)
    return { success: false, error: "Failed to create event" }
  }
}

// Find events by city
export async function findEventsByCity(data: { city: string; userId: string }) {
  try {
    await connectToDatabase()

    const events = await Event.find({
      city: { $regex: new RegExp(data.city, "i") },
    }).populate("admin", "username")

    // Transform events to include participant count and check if user is registered
    const transformedEvents = await Promise.all(
      events.map(async (event) => {
        const isRegistered = event.registeredUsers.some(
          (registration: any) => registration.userId.toString() === data.userId,
        )

        return {
          _id: event._id,
          name: event.name,
          description: event.description,
          city: event.city,
          address: event.address,
          dateTime: event.dateTime,
          fee: event.fee,
          participantLimit: event.participantLimit,
          image: event.image,
          isPrivate: event.isPrivate,
          admin: event.admin,
          participantCount: event.registeredUsers.length,
          isRegistered,
        }
      }),
    )

    return transformedEvents
  } catch (error) {
    console.error("Find events error:", error)
    throw new Error("Failed to find events")
  }
}

// Get event details
export async function getEventDetails(data: { eventId: string; userId: string }) {
  try {
    await connectToDatabase()

    const event = await Event.findById(data.eventId).populate("admin", "username")

    if (!event) {
      return { success: false, error: "Event not found" }
    }

    const isAdmin = event.admin._id.toString() === data.userId
    const isRegistered = event.registeredUsers.some(
      (registration: any) => registration.userId.toString() === data.userId,
    )
    const isFull = event.participantLimit > 0 && event.registeredUsers.length >= event.participantLimit

    return {
      success: true,
      event: {
        _id: event._id,
        name: event.name,
        description: event.description,
        city: event.city,
        address: event.address,
        dateTime: event.dateTime,
        fee: event.fee,
        participantLimit: event.participantLimit,
        image: event.image,
        isPrivate: event.isPrivate,
        admin: event.admin,
        registeredUsers: isAdmin ? event.registeredUsers : [],
        participantCount: event.registeredUsers.length,
        isAdmin,
        isRegistered,
        isFull,
      },
    }
  } catch (error) {
    console.error("Get event details error:", error)
    return { success: false, error: "Failed to get event details" }
  }
}

// Register for an event
export async function registerForEvent(data: {
  userId: string
  eventId: string
  name: string
  email: string
  username: string
}) {
  try {
    await connectToDatabase()

    const user = await User.findById(data.userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const event = await Event.findById(data.eventId)
    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user is already registered
    const isRegistered = event.registeredUsers.some(
      (registration: any) => registration.userId.toString() === data.userId,
    )

    if (isRegistered) {
      return { success: false, error: "You are already registered for this event" }
    }

    // Check if event is full
    if (event.participantLimit > 0 && event.registeredUsers.length >= event.participantLimit) {
      return { success: false, error: "This event is full" }
    }

    // Add user to event's registeredUsers
    event.registeredUsers.push({
      userId: data.userId,
      name: data.name,
      email: data.email,
      username: data.username,
      registeredAt: new Date(),
    })

    await event.save()

    // Add event to user's registeredEvents
    user.registeredEvents.push(event._id)
    await user.save()

    return { success: true }
  } catch (error) {
    console.error("Register for event error:", error)
    return { success: false, error: "Failed to register for event" }
  }
}

// Unregister from an event
export async function unregisterFromEvent(data: { userId: string; eventId: string }) {
  try {
    await connectToDatabase()

    const user = await User.findById(data.userId)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const event = await Event.findById(data.eventId)
    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Remove user from event's registeredUsers
    event.registeredUsers = event.registeredUsers.filter(
      (registration: any) => registration.userId.toString() !== data.userId,
    )

    await event.save()

    // Remove event from user's registeredEvents
    user.registeredEvents = user.registeredEvents.filter(
      (eventId: mongoose.Types.ObjectId) => eventId.toString() !== data.eventId,
    )
    await user.save()

    return { success: true }
  } catch (error) {
    console.error("Unregister from event error:", error)
    return { success: false, error: "Failed to unregister from event" }
  }
}

// Get user's registered events
export async function getUserRegisteredEvents(data: { userId: string }) {
  try {
    await connectToDatabase()

    const user = await User.findById(data.userId).populate({
      path: "registeredEvents",
      populate: {
        path: "admin",
        select: "username",
      },
    })

    if (!user) {
      return []
    }

    // Transform events to include participant count
    const transformedEvents = user.registeredEvents.map((event: any) => ({
      _id: event._id,
      name: event.name,
      description: event.description,
      city: event.city,
      address: event.address,
      dateTime: event.dateTime,
      fee: event.fee,
      participantLimit: event.participantLimit,
      image: event.image,
      isPrivate: event.isPrivate,
      admin: event.admin,
      participantCount: event.registeredUsers.length,
    }))

    return transformedEvents
  } catch (error) {
    console.error("Get user registered events error:", error)
    throw new Error("Failed to get registered events")
  }
}

// Get user's admin events
export async function getUserAdminEvents(data: { userId: string }) {
  try {
    await connectToDatabase()

    const user = await User.findById(data.userId).populate({
      path: "adminEvents",
      populate: {
        path: "admin",
        select: "username",
      },
    })

    if (!user) {
      return []
    }

    // Transform events to include participant count
    const transformedEvents = user.adminEvents.map((event: any) => ({
      _id: event._id,
      name: event.name,
      description: event.description,
      city: event.city,
      address: event.address,
      dateTime: event.dateTime,
      fee: event.fee,
      participantLimit: event.participantLimit,
      image: event.image,
      isPrivate: event.isPrivate,
      admin: event.admin,
      participantCount: event.registeredUsers.length,
    }))

    return transformedEvents
  } catch (error) {
    console.error("Get user admin events error:", error)
    throw new Error("Failed to get admin events")
  }
}

// Update an event
export async function updateEvent(data: {
  userId: string
  eventId: string
  name: string
  description: string
  city: string
  address: string
  dateTime: string
  fee: number | null
  participantLimit: number
  image?: string
  isPrivate: boolean
}) {
  try {
    await connectToDatabase()

    const event = await Event.findById(data.eventId)
    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user is the admin of the event
    if (event.admin.toString() !== data.userId) {
      return { success: false, error: "You are not authorized to update this event" }
    }

    // Update event
    event.name = data.name
    event.description = data.description
    event.city = data.city
    event.address = data.address
    event.dateTime = new Date(data.dateTime)
    event.fee = data.fee
    event.participantLimit = data.participantLimit
    if (data.image) {
      event.image = data.image
    }
    event.isPrivate = data.isPrivate

    await event.save()

    return { success: true }
  } catch (error) {
    console.error("Update event error:", error)
    return { success: false, error: "Failed to update event" }
  }
}

// Delete an event
export async function deleteEvent(data: { userId: string; eventId: string }) {
  try {
    await connectToDatabase()

    const event = await Event.findById(data.eventId)
    if (!event) {
      return { success: false, error: "Event not found" }
    }

    // Check if user is the admin of the event
    if (event.admin.toString() !== data.userId) {
      return { success: false, error: "You are not authorized to delete this event" }
    }

    // Get all registered users
    const registeredUserIds = event.registeredUsers.map((registration: any) => registration.userId)

    // Remove event from all registered users' registeredEvents
    await User.updateMany({ _id: { $in: registeredUserIds } }, { $pull: { registeredEvents: data.eventId } })

    // Remove event from admin's adminEvents
    await User.updateOne({ _id: data.userId }, { $pull: { adminEvents: data.eventId } })

    // Delete event
    await Event.findByIdAndDelete(data.eventId)

    return { success: true }
  } catch (error) {
    console.error("Delete event error:", error)
    return { success: false, error: "Failed to delete event" }
  }
}
