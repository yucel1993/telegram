"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ImageIcon, Check, AlertCircle, Loader2, Users, ArrowLeft } from "lucide-react"
import { getEventDetails, updateEvent } from "@/app/actions/events"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface EditEventFormProps {
  userId: string
  eventId: string
}

export default function EditEventForm({ userId, eventId }: EditEventFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [dateTime, setDateTime] = useState("")
  const [isFree, setIsFree] = useState(true)
  const [fee, setFee] = useState("")
  const [participantLimit, setParticipantLimit] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchEventDetails()
  }, [eventId])

  const fetchEventDetails = async () => {
    setLoading(true)
    try {
      const result = await getEventDetails({ eventId, userId })

      if (result.success) {
        const event = result.event

        // Check if user is admin
        if (!event.isAdmin) {
          router.push(`/event/${eventId}`)
          return
        }

        // Populate form with event data
        setName(event.name)
        setDescription(event.description || "")
        setCity(event.city)
        setAddress(event.address)

        // Format date for datetime-local input
        const eventDate = new Date(event.dateTime)
        const formattedDate = format(eventDate, "yyyy-MM-dd'T'HH:mm")
        setDateTime(formattedDate)

        setIsFree(event.fee === null)
        setFee(event.fee !== null ? event.fee.toString() : "")
        setParticipantLimit(event.participantLimit.toString())
        setIsPrivate(event.isPrivate)
        setImage(event.image)
        setImagePreview(event.image)
      } else {
        setError("Event not found or you don't have permission to edit it")
      }
    } catch (error) {
      console.error("Error fetching event details:", error)
      setError("Failed to load event details")
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImage(result)
        setImagePreview(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    if (!name.trim()) {
      setError("Event name is required")
      return
    }

    if (!city.trim()) {
      setError("City is required")
      return
    }

    if (!address.trim()) {
      setError("Address is required")
      return
    }

    if (!dateTime) {
      setError("Date and time are required")
      return
    }

    if (!isFree && !fee) {
      setError("Please enter a fee amount")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updateEvent({
        userId,
        eventId,
        name,
        description,
        city,
        address,
        dateTime,
        fee: isFree ? null : Number(fee),
        participantLimit: participantLimit ? Number(participantLimit) : 0,
        image, // later will be added
        isPrivate,
      })

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || "Failed to update event")
      }
    } catch (error) {
      console.error("Error updating event:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>

      {success ? (
        <div className="bg-green-50 p-4 rounded-md text-green-800 mb-4">
          <div className="flex items-start">
            <Check className="h-5 w-5 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium">Event Updated Successfully!</h3>
              <p className="text-sm mt-1">Your event has been updated.</p>
              <div className="mt-4 flex space-x-4">
                <Button variant="outline" size="sm" onClick={() => router.push(`/event/${eventId}`)}>
                  View Event
                </Button>
                <Button size="sm" onClick={() => router.push("/events?section=manage")}>
                  Manage Your Events
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 p-3 rounded-md text-red-800 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Event Name <span className="text-red-500">*</span>
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter event name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter event description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter city name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTime">
              Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="isFree">This is a free event</Label>
              <Switch id="isFree" checked={isFree} onCheckedChange={setIsFree} />
            </div>

            {!isFree && (
              <div className="mt-2">
                <Label htmlFor="fee">
                  Fee Amount <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantLimit">Participant Limit (0 = no limit)</Label>
            <div className="relative">
              <Input
                id="participantLimit"
                type="number"
                min="0"
                value={participantLimit}
                onChange={(e) => setParticipantLimit(e.target.value)}
                placeholder="0"
                className="pl-8"
              />
              <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="isPrivate">Private Event (only visible to registered users)</Label>
              <Switch id="isPrivate" checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Event Image (Optional)</Label>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("image-upload")?.click()}
                className="flex items-center"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {imagePreview ? "Change Image" : "Upload Image"}
              </Button>
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              {imagePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImage(null)
                    setImagePreview(null)
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Event preview"
                  className="max-h-40 rounded-md object-cover"
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Event...
              </>
            ) : (
              "Update Event"
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
