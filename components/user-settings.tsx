"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, User, Upload, Loader2, Check, AlertCircle, X } from "lucide-react"
import { getUserProfile, updateUserProfile } from "@/app/actions/users"
import { uploadFile } from "@/app/actions/upload"
import ImageCropper from "./image-cropper"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserSettingsProps {
  userId: string
  onBack: () => void
}

// List of languages for the dropdown
const languages = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Japanese",
  "Chinese",
  "Korean",
  "Arabic",
  "Hindi",
  "Turkish",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Polish",
  "Czech",
  "Greek",
  "Hungarian",
  "Romanian",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino",
  "Hebrew",
  "Ukrainian",
].sort()

export default function UserSettings({ userId, onBack }: UserSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cropperImage, setCropperImage] = useState<string | null>(null)
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoading(true)
        const profile = await getUserProfile({ userId })
        if (profile) {
          setUsername(profile.username || "")
          setProfileImage(profile.profileImage || null)
          setImagePreview(profile.profileImage || null)
          setNativeLanguage(profile.nativeLanguage || null)
          setTargetLanguage(profile.targetLanguage || null)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create a preview and open cropper
    const reader = new FileReader()
    reader.onloadend = () => {
      setCropperImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedImage: string) => {
    try {
      setUploadingImage(true)
      setError(null)
      setCropperImage(null)
      setImagePreview(croppedImage)

      // Convert base64 to blob
      const response = await fetch(croppedImage)
      const blob = await response.blob()
      const file = new File([blob], "profile-image.jpg", { type: "image/jpeg" })

      // Upload to S3
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadFile(formData)

      if (result.success && result.file && result.file.s3Key) {
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

  const handleCropCancel = () => {
    setCropperImage(null)
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
        nativeLanguage,
        targetLanguage,
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
    <div className="p-4 pb-20 md:pb-4">
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

          <div className="space-y-2">
            <Label htmlFor="nativeLanguage">Native Language</Label>
            <Select value={nativeLanguage || "none"} onValueChange={setNativeLanguage}>
              <SelectTrigger id="nativeLanguage">
                <SelectValue placeholder="Select your native language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetLanguage">Target Language</Label>
            <Select value={targetLanguage || "none"} onValueChange={setTargetLanguage}>
              <SelectTrigger id="targetLanguage">
                <SelectValue placeholder="Select language you want to learn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Setting your language preferences helps you find language exchange partners
            </p>
          </div>

          <div className="pt-4 sticky bottom-0 bg-white pb-4">
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
          </div>
        </form>
      )}

      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
    </div>
  )
}
