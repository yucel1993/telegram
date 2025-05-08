"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, AlertCircle, Globe, Clock, MapPin } from "lucide-react"
import { getLanguageBuddies } from "@/app/actions/users"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface LanguageBuddiesProps {
  userId: string
  onBack: () => void
  onSelectUser: (userId: string) => void
}

export default function LanguageBuddies({ userId, onBack, onSelectUser }: LanguageBuddiesProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buddies, setBuddies] = useState<any[]>([])
  const [userLanguages, setUserLanguages] = useState<{
    nativeLanguage: string | null
    targetLanguage: string | null
  }>({
    nativeLanguage: null,
    targetLanguage: null,
  })

  useEffect(() => {
    async function fetchLanguageBuddies() {
      try {
        setLoading(true)
        const result = await getLanguageBuddies({ userId, distance: 10000 }) // 10km in meters

        if (result.success) {
          setBuddies(result.buddies || [])
          setUserLanguages({
            nativeLanguage: result.userLanguages?.nativeLanguage || null,
            targetLanguage: result.userLanguages?.targetLanguage || null,
          })
        } else {
          setError(result.error || "Failed to load language buddies")
        }
      } catch (error) {
        console.error("Error fetching language buddies:", error)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLanguageBuddies()
  }, [userId])

  const formatLastActive = (date: string | Date) => {
    if (!date) return "Unknown"
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-medium">Language Buddies</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-3 rounded-md text-red-800 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <div>
            <p>{error}</p>
            {(!userLanguages.nativeLanguage || !userLanguages.targetLanguage) && (
              <p className="mt-2 text-sm">
                Please set your native and target languages in your profile settings to find language buddies.
              </p>
            )}
          </div>
        </div>
      ) : buddies.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="mb-2">No language buddies found nearby</p>
          <p className="text-sm">
            {userLanguages.targetLanguage
              ? `We couldn't find anyone who speaks ${userLanguages.targetLanguage} within 10km.`
              : "Please set your target language in profile settings."}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              {`Showing people who speak ${userLanguages.targetLanguage} within 10km`}
            </p>
          </div>

          <div className="space-y-3">
            {buddies.map((buddy) => (
              <div
                key={buddy._id}
                className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectUser(buddy._id)}
              >
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-3">
                    {buddy.profileImage ? (
                      <AvatarImage src={buddy.profileImage || "/placeholder.svg"} alt={buddy.username} />
                    ) : (
                      <AvatarFallback>{buddy.username.charAt(0).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{buddy.username}</h3>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatLastActive(buddy.lastActive)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                          Speaks: {buddy.nativeLanguage}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                          Learning: {buddy.targetLanguage}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {Math.round(buddy.distance / 100) / 10} km away
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
