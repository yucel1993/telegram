"use server"

import { cookies } from "next/headers"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/user"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function signup(formData: FormData) {
  try {
    await connectToDatabase()

    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Validate input
    if (!username || !email || !password) {
      return { success: false, error: "All fields are required" }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    })

    if (existingUser) {
      if (existingUser.username === username) {
        return {
          success: false,
          error: "Username already exists",
        }
      }
      return {
        success: false,
        error: "Email already exists",
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      location: null,
      lastActive: new Date(),
      registeredEvents: [],
      adminEvents: [],
    })

    await newUser.save()

    // Create session
    const sessionId = uuidv4()
    cookies().set({
      name: "user_session",
      value: JSON.stringify({
        id: newUser._id.toString(),
        username: newUser.username,
        sessionId,
      }),
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return { success: true }
  } catch (error) {
    console.error("Signup error:", error)
    return { success: false, error: "Failed to create account" }
  }
}

export async function login(formData: FormData) {
  try {
    await connectToDatabase()

    const username = formData.get("username") as string
    const password = formData.get("password") as string

    // Validate input
    if (!username || !password) {
      return { success: false, error: "All fields are required" }
    }

    // Find user
    const user = await User.findOne({ username })

    if (!user) {
      return { success: false, error: "Invalid username or password" }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return { success: false, error: "Invalid username or password" }
    }

    // Update last active
    user.lastActive = new Date()
    await user.save()

    // Create session
    const sessionId = uuidv4()
    cookies().set({
      name: "user_session",
      value: JSON.stringify({
        id: user._id.toString(),
        username: user.username,
        sessionId,
      }),
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Failed to login" }
  }
}

export async function logout() {
  cookies().delete("user_session")
  return { success: true }
}

export async function getCurrentUser() {
  const sessionCookie = cookies().get("user_session")

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    return session
  } catch {
    return null
  }
}

export async function checkUsernameAvailability(username: string) {
  try {
    await connectToDatabase()

    const existingUser = await User.findOne({ username })

    return {
      available: !existingUser,
    }
  } catch (error) {
    console.error("Error checking username:", error)
    return { available: false, error: "Failed to check username availability" }
  }
}
