"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, Users, Trash2, Edit, Loader2, AlertCircle, Eye } from "lucide-react"
import { getUserAdminEvents, deleteEvent } from "@/app/actions/events"
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

interface ManageEventsProps {
  userId: string
}

export default function ManageEvents({ userId }: ManageEventsProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchAdminEvents()
  }, [userId])

  const fetchAdminEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const adminEvents = await getUserAdminEvents({ userId })
      setEvents(adminEvents)
    } catch (error) {
      console.error("Error fetching admin events:", error)
      setError("Failed to load your events. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation() // Prevent event card click
    setEventToDelete(eventId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteEvent({
        userId,
        eventId: eventToDelete,
      })

      if (result.success) {
        // Remove the event from the list
        setEvents(events.filter((event) => event._id !== eventToDelete))
      } else {
        setError(result.error || "Failed to delete event")
      }
    } catch (error) {
      console.error("Error deleting event:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }

  const handleViewEvent = (eventId: string) => {
    router.push(`/event/${eventId}`)
  }

  const handleEditEvent = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation() // Prevent event card click
    router.push(`/event/edit/${eventId}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Manage Your Events</h1>

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
              <div className="flex justify-between items-start">
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
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{format(new Date(event.dateTime), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{format(new Date(event.dateTime), "h:mm a")}</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-1 mt-0.5" />
                  <span className="line-clamp-1">
                    {event.address}, {event.city}
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>
                    {event.participantCount} participants
                    {event.participantLimit > 0 && ` (Limit: ${event.participantLimit})`}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" className="flex items-center justify-center">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center justify-center"
                  onClick={(e) => handleEditEvent(e, event._id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center justify-center text-red-600 hover:bg-red-50"
                  onClick={(e) => handleDeleteClick(e, event._id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>You haven't created any events yet</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/events?section=create")}>
            Create Your First Event
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone and all participant data will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
