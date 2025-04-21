"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, User, Loader2, MapPin, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNearbyUsers } from "@/app/actions/users"
import { getNearbyGroups } from "@/app/actions/groups"

interface NearbyUser {
  _id: string
  username: string
  distance: number
  lastActive?: Date
}

interface NearbyGroup {
  _id: string
  name: string
  description?: string
  distance: number
  participantsCount: number
}

interface NearbySectionProps {
  userId: string
  onSelectChat: (chatId: string) => void
  onBack: () => void
}

export default function NearbySection({ userId, onSelectChat, onBack }: NearbySectionProps) {
  const [activeTab, setActiveTab] = useState("users")
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [nearbyGroups, setNearbyGroups] = useState<NearbyGroup[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNearbyUsers()
    fetchNearbyGroups()
  }, [userId])

  const fetchNearbyUsers = async () => {
    setLoadingUsers(true)
    setError(null)
    try {
      const users = await getNearbyUsers({ userId, distance: 1000 })
      setNearbyUsers(users as NearbyUser[])
    } catch (error) {
      console.error("Error fetching nearby users:", error)
      setError("Failed to load nearby users. Please try refreshing.")
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchNearbyGroups = async () => {
    setLoadingGroups(true)
    setError(null)
    try {
      const groups = await getNearbyGroups({ userId, distance: 1000 })
      console.log("Fetched nearby groups:", groups)
      setNearbyGroups(groups as NearbyGroup[])
    } catch (error) {
      console.error("Error fetching nearby groups:", error)
      setError("Failed to load nearby groups. Please try refreshing.")
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleRefresh = () => {
    if (activeTab === "users") {
      fetchNearbyUsers()
    } else {
      fetchNearbyGroups()
    }
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-medium">Nearby (1000m)</h2>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="flex items-center">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <Tabs defaultValue="users" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="users" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : nearbyUsers.length > 0 ? (
            <div className="space-y-2">
              {nearbyUsers.map((user) => (
                <div
                  key={user._id}
                  className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                  onClick={() => onSelectChat(user._id)}
                >
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {user.distance.toFixed(0)}m away
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-8">No nearby users found</div>
          )}
        </TabsContent>

        <TabsContent value="groups">
          {loadingGroups ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : nearbyGroups.length > 0 ? (
            <div className="space-y-2">
              {nearbyGroups.map((group) => (
                <div
                  key={group._id}
                  className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                  onClick={() => onSelectChat(group._id)}
                >
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-500" />
                    <div className="font-medium">{group.name}</div>
                  </div>
                  {group.description && <div className="text-sm text-gray-600 mt-1 truncate">{group.description}</div>}
                  <div className="flex justify-between mt-1">
                    <div className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {group.distance.toFixed(0)}m away
                    </div>
                    <div className="text-xs text-gray-500">{group.participantsCount} members</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-8">
              <p>No nearby groups found</p>
              <p className="text-xs mt-2">Try creating a group with location enabled</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
