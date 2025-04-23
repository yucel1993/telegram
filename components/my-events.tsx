"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, Users, Loader2, AlertCircle, X } from "lucide-react"
import { getUserRegisteredEvents, unregisterFromEvent } from "@/app/actions/events"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"

interface MyEventsProps {
  userId: string
}

export default function MyEvents({ userId }: MyEventsProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unregisterDialogOpen, setUnregisterDialogOpen] = useState(false)
  const [eventToUnregister, setEventToUnregister] = useState<string | null>(null)
  const [isUnregistering, setIsUnregistering] = useState(false)
  const router = useRouter()
  const isMobile = useMobile()

  useEffect(() => {
    fetchRegisteredEvents()
  }, [userId])

  const fetchRegisteredEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const registeredEvents = await getUserRegisteredEvents({ userId })
      setEvents(registeredEvents)
    } catch (error) {
      console.error("Error fetching registered events:", error)
      setError("Failed to load your events. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleUnregisterClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation() // Prevent event card click
    setEventToUnregister(eventId)
    setUnregisterDialogOpen(true)
  }

  const handleUnregisterConfirm = async () => {
    if (!eventToUnregister) return

    setIsUnregistering(true)
    try {
      const result = await unregisterFromEvent({
        userId,
        eventId: eventToUnregister,
      })

      if (result.success) {
        // Remove the event from the list
        setEvents(events.filter((event) => event._id !== eventToUnregister))
      } else {
        setError(result.error || "Failed to unregister from event")
      }
    } catch (error) {
      console.error("Error unregistering from event:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsUnregistering(false)
      setUnregisterDialogOpen(false)
      setEventToUnregister(null)
    }
  }

  const handleViewEvent = (eventId: string) => {
    router.push(`/event/${eventId}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">My Events</h1>

      {error && (
        <div className="bg-red-50 p-3 rounded-md text-red-800 flex items-start mb-4">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event._id}
              className="p-4 rounded-lg border bg-white cursor-pointer hover:bg-gray-50"
              onClick={() => handleViewEvent(event._id)}
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                <h3 className="font-medium text-lg">{event.name}</h3>
                {event.fee === null ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Free</span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    ${event.fee.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{format(new Date(event.dateTime), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{format(new Date(event.dateTime), "h:mm a")}</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1 break-words">
                    {event.address}, {event.city}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>
                    {event.participantCount} participants
                    {event.participantLimit > 0 && ` (Limit: ${event.participantLimit})`}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center justify-center text-red-600 hover:bg-red-50"
                  onClick={(e) => handleUnregisterClick(e, event._id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Unregister
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>You haven't registered for any events yet</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/events?section=find")}>
            Find Events
          </Button>
        </div>
      )}

      <AlertDialog open={unregisterDialogOpen} onOpenChange={setUnregisterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unregister from Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unregister from this event? You may not be able to register again if the event
              becomes full.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnregistering}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnregisterConfirm}
              disabled={isUnregistering}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUnregistering ? "Unregistering..." : "Unregister"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
