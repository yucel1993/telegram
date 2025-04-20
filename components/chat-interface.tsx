"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, MapPin, LogOut, Users } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { updateUserLocation, getNearbyUsers } from "@/app/actions/users"
import UserChatList from "@/components/user-chat-list"
import ChatArea from "@/components/chat-area"
import UserSearch from "@/components/user-search"

interface ChatInterfaceProps {
  userId: string
  username: string
}

export default function ChatInterface({ userId, username }: ChatInterfaceProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showNearbyUsers, setShowNearbyUsers] = useState(false)
  const [nearbyUsers, setNearbyUsers] = useState([])
  const [locationEnabled, setLocationEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if location is already enabled
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") {
        setLocationEnabled(true)
        updateLocation()
      }
    })
  }, [])

  const updateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          await updateUserLocation({
            userId,
            latitude,
            longitude,
          })
          setLocationEnabled(true)
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }

  const handleEnableLocation = () => {
    updateLocation()
  }

  const handleFindNearbyUsers = async () => {
    if (locationEnabled) {
      const users = await getNearbyUsers({ userId, distance: 1000 })
      setNearbyUsers(users)
      setShowNearbyUsers(true)
      setShowSearch(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
    router.refresh()
  }

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId)
    setShowSearch(false)
    setShowNearbyUsers(false)
  }

  const handleSearchClick = () => {
    setShowSearch(true)
    setShowNearbyUsers(false)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">ChatApp</h2>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1" onClick={handleSearchClick}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleFindNearbyUsers} disabled={!locationEnabled}>
              <Users className="h-4 w-4 mr-2" />
              Nearby
            </Button>
          </div>
          {!locationEnabled && (
            <div className="mt-2 p-2 bg-yellow-50 rounded-md text-sm">
              <div className="flex items-center text-yellow-700 mb-1">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Location is disabled</span>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleEnableLocation}>
                Enable Location
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {showSearch ? (
            <UserSearch userId={userId} onSelectUser={handleSelectChat} />
          ) : showNearbyUsers ? (
            <div className="p-4">
              <h3 className="font-medium mb-2">Nearby Users (1000m)</h3>
              {nearbyUsers.length > 0 ? (
                <div className="space-y-2">
                  {nearbyUsers.map((user: any) => (
                    <div
                      key={user._id}
                      className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSelectChat(user._id)}
                    >
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.distance.toFixed(0)}m away</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No nearby users found</div>
              )}
            </div>
          ) : (
            <UserChatList userId={userId} onSelectChat={handleSelectChat} selectedChatId={selectedChat} />
          )}
        </div>
      </div>

      {/* Right chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatArea userId={userId} chatId={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <h3 className="text-xl font-medium text-gray-700 mb-2">Welcome, {username}!</h3>
              <p className="text-gray-500 max-w-md">
                Select a chat from the sidebar or search for users to start a conversation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
