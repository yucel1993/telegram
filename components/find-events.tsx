"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, MapPin, Clock, Users, Search, Loader2, AlertCircle, Globe } from "lucide-react"
import { findEventsByCity } from "@/app/actions/events"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useMobile } from "@/hooks/use-mobile"

interface FindEventsProps {
  userId: string
}

export default function FindEvents({ userId }: FindEventsProps) {
  const [city, setCity] = useState("")
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const isMobile = useMobile()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!city.trim()) {
      setError("Please enter a city name")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await findEventsByCity({ city: city.trim(), userId })
      // Filter to only show public events
      const publicEvents = results.filter((event: any) => !event.isPrivate)
      setEvents(publicEvents)
      setSearched(true)
    } catch (error) {
      console.error("Error searching events:", error)
      setError("Failed to search events. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewEvent = (eventId: string) => {
    router.push(`/event/${eventId}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Find Events</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium">
              Search public events by city
            </label>
            <div className="flex space-x-2">
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city name"
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !city.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </form>

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
      ) : searched ? (
        events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event._id}
                className="p-4 rounded-lg border bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => handleViewEvent(event._id)}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <h3 className="font-medium text-lg">{event.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.fee === null ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Free</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        ${event.fee.toFixed(2)}
                      </span>
                    )}
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </span>
                  </div>
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

                <div className="mt-3">
                  <Button size="sm" className="w-full">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No public events found in {city}</p>
            <p className="text-sm mt-1">Try searching for a different city or create your own event</p>
          </div>
        )
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>Enter a city name to find public events</p>
        </div>
      )}
    </div>
  )
}
