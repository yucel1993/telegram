"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Users, Search, X, Check, ImageIcon, MapPin, Loader2, AlertCircle, Upload } from "lucide-react"
import { searchUsers } from "@/app/actions/groups"
import { createGroupWithLocation } from "@/app/actions/groups"
import { uploadFile } from "@/app/actions/upload"

interface CreateGroupProps {
  userId: string
  onBack: () => void
  onGroupCreated: (chatId: string) => void
}

export default function CreateGroup({ userId, onBack, onGroupCreated }: CreateGroupProps) {
  const [step, setStep] = useState<"select" | "details">("select")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [enableLocation, setEnableLocation] = useState(false)
  const [locationAvailable, setLocationAvailable] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [creationError, setCreationError] = useState<string | null>(null)

  // Add state for group image
  const [groupImage, setGroupImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    // Check if location is available
    if (navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          setLocationAvailable(true)
        }
      })
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const results = await searchUsers({
        userId,
        query: searchQuery,
      })
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearching(false)
    }
  }

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id))
    } else {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId))
  }

  const handleNext = () => {
    if (selectedUsers.length > 0) {
      setStep("details")
    }
  }

  // Add a function to handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)

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

      if (result.success && result.file && result.file.s3Key) {
        setGroupImage(result.file.s3Key)
      } else {
        console.error("Failed to upload image", result)
        setImagePreview(null)
        setGroupImage(null)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  // Add a function to remove the image
  const handleRemoveImage = () => {
    setGroupImage(null)
    setImagePreview(null)
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return

    setCreating(true)
    setCreationError(null)

    try {
      const participantIds = selectedUsers.map((user) => user._id)

      let location = null

      // If location is enabled, get current coordinates
      if (enableLocation && locationAvailable) {
        setLocationLoading(true)
        setLocationError(null)

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            })
          })

          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }

          console.log("Got location for group:", location)
        } catch (error) {
          console.error("Error getting location:", error)
          setLocationError("Failed to get your location. Please try again or disable location.")
          // Continue without location if there's an error
          location = null
        } finally {
          setLocationLoading(false)
        }
      }

      const result = await createGroupWithLocation({
        userId,
        name: groupName.trim(),
        description: groupDescription.trim(),
        participants: participantIds,
        location: location,
        groupImage: groupImage, // Add the group image
      })

      if (result.success && result.chatId) {
        onGroupCreated(result.chatId)
      } else {
        console.error("Failed to create group:", result.error)
        setCreationError(result.error || "Failed to create group. Please try again.")
      }
    } catch (error) {
      console.error("Error creating group:", error)
      setCreationError("An unexpected error occurred. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-medium">{step === "select" ? "New Group" : "Create Group"}</h2>
        {step === "select" && selectedUsers.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleNext} className="ml-auto">
            Next
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === "select" ? (
          <div className="p-4">
            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Selected: {selectedUsers.length}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm flex items-center"
                    >
                      {user.username}
                      <button
                        onClick={() => removeSelectedUser(user._id)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex space-x-2 mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="flex-1"
              />
              <Button type="submit" disabled={searching || !searchQuery.trim()}>
                {searching ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>

            {/* Search results */}
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="p-3 bg-gray-50 rounded-md flex justify-between items-center"
                  onClick={() => toggleUserSelection(user)}
                >
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-500">
                      {user.lastActive
                        ? `Last active: ${new Date(user.lastActive).toLocaleDateString()}`
                        : "Never active"}
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedUsers.some((u) => u._id === user._id)}
                    onCheckedChange={() => toggleUserSelection(user)}
                  />
                </div>
              ))}
            </div>

            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="text-center text-gray-500 p-4">No users found matching "{searchQuery}"</div>
            )}

            {!searchQuery && (
              <div className="text-center text-gray-500 p-4">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Search for users to add to your group</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview || "/placeholder.svg"} alt="Group" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-500" />
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("group-image")?.click()}
                  disabled={uploadingImage}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {imagePreview ? "Change Image" : "Upload Image"}
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
                <input
                  id="group-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                />
              </div>
            </div>

            {creationError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error creating group</p>
                  <p className="text-sm">{creationError}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="groupName" className="block text-sm font-medium mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>

              <div>
                <label htmlFor="groupDescription" className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <Input
                  id="groupDescription"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                />
              </div>

              {locationAvailable && (
                <div className="flex flex-col bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium">Enable Location for Nearby Discovery</span>
                        <p className="text-xs text-gray-500 mt-1">
                          This will allow others to find this group when searching nearby
                        </p>
                      </div>
                    </div>
                    <Switch checked={enableLocation} onCheckedChange={setEnableLocation} aria-label="Enable location" />
                  </div>

                  {locationError && enableLocation && (
                    <div className="mt-2 text-xs text-red-600 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {locationError}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="text-sm font-medium mb-2">Participants ({selectedUsers.length})</div>
                <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                  {selectedUsers.map((user) => (
                    <div key={user._id} className="flex items-center justify-between py-1">
                      <span>{user.username}</span>
                      <button onClick={() => removeSelectedUser(user._id)} className="text-gray-500 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleCreateGroup}
                  disabled={creating || locationLoading || !groupName.trim() || selectedUsers.length === 0}
                  className="w-full"
                >
                  {creating || locationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {locationLoading ? "Getting location..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Group
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
