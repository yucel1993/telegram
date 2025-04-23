"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, MapPin, User, Users, ArrowLeft, Loader2, AlertCircle, Check, Globe, Lock } from "lucide-react"
import { getEventDetails, registerForEvent } from "@/app/actions/events"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useMobile } from "@/hooks/use-mobile"

interface EventDetailProps {
  userId: string
  eventId: string
}

export default function EventDetail({ userId, eventId }: EventDetailProps) {
  const [event, setEvent] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const router = useRouter()
  const isMobile = useMobile()

  useEffect(() => {
    fetchEventDetails()
  }, [eventId])

  const fetchEventDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getEventDetails({ eventId, userId })

      if (result.success) {
        setEvent(result.event)
      } else {
        setError(result.error || "Event not found")
      }
    } catch (error) {
      console.error("Error fetching event details:", error)
      setError("Failed to load event details")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegistering(true)
    setError(null)

    try {
      const result = await registerForEvent({
        userId,
        eventId,
        name,
        email,
        username,
      })

      if (result.success) {
        setRegisterSuccess(true)
        setShowSuccessDialog(true)
        // Refresh event data to show updated participants
        fetchEventDetails()
      } else {
        setError(result.error || "Failed to register for event")
      }
    } catch (error) {
      console.error("Error registering for event:", error)
      setError("An unexpected error occurred")
    } finally {
      setRegistering(false)
    }
  }

  const handleReturnToEvents = () => {
    router.push("/events")
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6"
    style={isMobile ? { 
      height: 'calc(100vh - 60px)', 
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch' // for smooth scrolling on iOS
    } : {}}>
      <Button variant="ghost" onClick={() => router.push("/events")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-800 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : event ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{event.name}</h1>
              <div className="flex flex-wrap gap-2">
                {event.fee === null ? (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Free</span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    ${event.fee.toFixed(2)}
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.isPrivate ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {event.isPrivate ? (
                    <span className="flex items-center">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </span>
                  )}
                </span>
              </div>
            </div>

            {event.image && (
              <div className="mt-4">
                <img
                  src={event.image || "/placeholder.svg"}
                  alt={event.name}
                  className="rounded-md max-h-60 w-full object-cover"
                />
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{format(new Date(event.dateTime), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{format(new Date(event.dateTime), "h:mm a")}</span>
              </div>
              <div className="flex items-start text-gray-600">
                <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span className="break-words">
                  {event.address}, {event.city}
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <User className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>Organized by {event.admin.username}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>
                  {event.participantCount} participants
                  {event.participantLimit > 0 && ` (Limit: ${event.participantLimit})`}
                </span>
              </div>
            </div>

            {event.description && (
              <div className="mt-6">
                <h2 className="text-lg font-medium mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {event.isAdmin && (
              <div className="mt-6">
                <Accordion type="single" collapsible>
                  <AccordionItem value="participants">
                    <AccordionTrigger>Participants ({event.registeredUsers.length})</AccordionTrigger>
                    <AccordionContent>
                      {event.registeredUsers.length > 0 ? (
                        <div className="space-y-2">
                          {event.registeredUsers.map((participant: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 rounded-md">
                              <div className="font-medium">{participant.name}</div>
                              <div className="text-gray-500">{participant.email}</div>
                              <div className="text-gray-500">Username: {participant.username || "Not provided"}</div>
                              <div className="text-xs text-gray-400">
                                Registered {format(new Date(participant.registeredAt), "MMM d, yyyy")}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm py-2">No participants yet</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>

          {!event.isAdmin && !event.isRegistered && !registerSuccess ? (
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h2 className="text-lg font-medium mb-4">Register for This Event</h2>
              {error && (
                <div className="bg-red-50 p-3 rounded-md text-red-800 flex items-start mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {event.isFull ? (
                <div className="bg-yellow-50 p-3 rounded-md text-yellow-800 flex items-start mb-4">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                  <span>This event is full. No more registrations are being accepted.</span>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Username
                    </label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={registering}>
                    {registering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register for Event"
                    )}
                  </Button>
                </form>
              )}
            </div>
          ) : event.isRegistered || registerSuccess ? (
            <div className="bg-green-50 p-6 rounded-lg shadow-md text-green-800">
              <div className="flex items-start">
                <Check className="h-5 w-5 mr-2 mt-0.5" />
                <div>
                  <h2 className="text-lg font-medium mb-2">You're Registered!</h2>
                  <p>
                    You have successfully registered for this event. The organizer will be notified of your
                    participation.
                  </p>
                  <Button onClick={handleReturnToEvents} variant="outline" className="mt-4 bg-white">
                    Return to Events Page
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Event not found</p>
        </div>
      )}

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registration Successful!</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col items-center py-4">
                <Check className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-center">
                  You have successfully registered for this event. The organizer will be notified of your participation.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleReturnToEvents}>Return to Events Page</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
