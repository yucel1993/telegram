"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, User, Loader2, MapPin } from "lucide-react"
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

  useEffect(() => {
    fetchNearbyUsers()
    fetchNearbyGroups()
  }, [userId])

  const fetchNearbyUsers = async () => {
    setLoadingUsers(true)
    try {
      const users = await getNearbyUsers({ userId, distance: 1000 })
      setNearbyUsers(users as NearbyUser[])
    } catch (error) {
      console.error("Error fetching nearby users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchNearbyGroups = async () => {
    setLoadingGroups(true)
    try {
      const groups = await getNearbyGroups({ userId, distance: 1000 })
      setNearbyGroups(groups as NearbyGroup[])
    } catch (error) {
      console.error("Error fetching nearby groups:", error)
    } finally {
      setLoadingGroups(false)
    }
  }

  return (
    <div className="p-4">
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
          <h3 className="font-medium mb-2">Nearby Users (1000m)</h3>
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
          <h3 className="font-medium mb-2">Nearby Groups (1000m)</h3>
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
            <div className="text-gray-500 text-sm text-center py-8">No nearby groups found</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
