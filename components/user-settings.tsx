"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, User, Upload, Loader2, Check, AlertCircle, X } from "lucide-react"
import { getUserProfile, updateUserProfile } from "@/app/actions/users"
import { uploadFile } from "@/app/actions/upload"

interface UserSettingsProps {
  userId: string
  onBack: () => void
}

export default function UserSettings({ userId, onBack }: UserSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoading(true)
        const profile = await getUserProfile({ userId })
        if (profile) {
          setUsername(profile.username || "")
          setProfileImage(profile.profileImage || null)
          setImagePreview(profile.profileImage || null)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        setError("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      setError(null)

      // Create a preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to S3
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadFile(formData)

      if (result.success && result.file) {
        setProfileImage(result.file.s3Key)
      } else {
        setError("Failed to upload image")
        setImagePreview(null)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      setError("Failed to upload image")
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    try {
      setSaving(true)
      const result = await updateUserProfile({
        userId,
        profileImage,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
        }, 3000)
      } else {
        setError(result.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-medium">Profile Settings</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 p-3 rounded-md text-red-800 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 p-3 rounded-md text-green-800 flex items-start">
              <Check className="h-5 w-5 mr-2 mt-0.5" />
              <span>Profile updated successfully</span>
            </div>
          )}

          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("profile-image")?.click()}
                disabled={uploadingImage}
              >
                <Upload className="h-4 w-4 mr-2" />
                {imagePreview ? "Change Photo" : "Upload Photo"}
              </Button>
              {imagePreview && (
                <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage} disabled={uploadingImage}>
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
              <input
                id="profile-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">Username cannot be changed</p>
          </div>

          <Button type="submit" className="w-full" disabled={saving || uploadingImage}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
