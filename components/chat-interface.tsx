"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, MapPin, LogOut, Users, ArrowLeft, MapPinOff, Loader2 } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { updateUserLocation, getNearbyUsers, disableLocation } from "@/app/actions/users"
import UserChatList from "@/components/user-chat-list"
import ChatArea from "@/components/chat-area"
import UserSearch from "@/components/user-search"
import { useMobile } from "@/hooks/use-mobile"

// Define the NearbyUser interface
interface NearbyUser {
  _id: string
  username: string
  distance: number
  lastActive?: Date
}

interface ChatInterfaceProps {
  userId: string
  username: string
}

export default function ChatInterface({ userId, username }: ChatInterfaceProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showNearbyUsers, setShowNearbyUsers] = useState(false)
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]) // Properly typed state
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [locationActive, setLocationActive] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const router = useRouter()
  const isMobile = useMobile()

  useEffect(() => {
    // Check if location is already enabled
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") {
        setLocationEnabled(true)
        // Don't automatically update location, wait for user to enable it
      }
    })
  }, [])

  const updateLocation = async () => {
    if (navigator.geolocation) {
      setLocationLoading(true)

      const timeoutId = setTimeout(() => {
        // If it's taking more than 5 seconds, we'll show a message
        // but keep waiting for the actual location
      }, 5000)

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId)
          const { latitude, longitude } = position.coords
          await updateUserLocation({
            userId,
            latitude,
            longitude,
          })
          setLocationEnabled(true)
          setLocationActive(true)
          setLocationLoading(false)
        },
        (error) => {
          clearTimeout(timeoutId)
          console.error("Error getting location:", error)
          // Even if there's an error, we should set locationEnabled to true
          // since the browser allowed the permission request
          setLocationEnabled(true)
          setLocationActive(false)
          setLocationLoading(false)
        },
        // Options to improve location accuracy and timeout
        {
          enableHighAccuracy: true,
          timeout: 30000, // 30 seconds timeout
          maximumAge: 0, // Don't use cached position
        },
      )
    }
  }

  const handleEnableLocation = () => {
    updateLocation()
  }

  const handleDisableLocation = async () => {
    try {
      setLocationLoading(true)
      await disableLocation({ userId })
      setLocationActive(false)
      // Keep locationEnabled true since the permission is still granted
      setLocationEnabled(true)
      setShowNearbyUsers(false)
    } catch (error) {
      console.error("Error disabling location:", error)
    } finally {
      setLocationLoading(false)
    }
  }

  const handleFindNearbyUsers = async () => {
    if (locationEnabled) {
      setNearbyLoading(true)

      // If location is not active, enable it first
      if (!locationActive) {
        await updateLocation()
      }

      try {
        const users = await getNearbyUsers({ userId, distance: 1000 })
        setNearbyUsers(users as NearbyUser[]) // Type assertion to fix the error
        setShowNearbyUsers(true)
        setShowSearch(false)
      } catch (error) {
        console.error("Error finding nearby users:", error)
      } finally {
        setNearbyLoading(false)
      }
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

  const handleBackClick = () => {
    setSelectedChat(null)
  }

  const handleBackToChats = () => {
    setShowNearbyUsers(false)
    setShowSearch(false)
  }

  const handleSearchClick = () => {
    setShowSearch(true)
    setShowNearbyUsers(false)
  }

  // Determine what to show based on mobile/desktop and selected state
  const showSidebar = !isMobile || (isMobile && !selectedChat)
  const showChatArea = !isMobile || (isMobile && selectedChat)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left sidebar */}
      {showSidebar && (
        <div className={`${isMobile ? "w-full" : "w-80"} bg-white border-r border-gray-200 flex flex-col`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">ChatApp</h2>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>

            {(showSearch || showNearbyUsers) && (
              <Button variant="outline" size="sm" onClick={handleBackToChats} className="mb-2 w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chats
              </Button>
            )}

            {!showSearch && !showNearbyUsers && (
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1" onClick={handleSearchClick}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleFindNearbyUsers}
                  disabled={!locationEnabled || locationLoading || nearbyLoading}
                >
                  {nearbyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Nearby
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Location status indicators */}
            {!showSearch && !showNearbyUsers && (
              <>
                {locationLoading && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                    <div className="flex items-center text-blue-700 mb-1">
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      <span>Getting your location...</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      This may take up to 20 seconds depending on your device and connection.
                    </p>
                  </div>
                )}

                {!locationLoading && locationActive && (
                  <div className="mt-2 p-2 bg-green-50 rounded-md text-sm">
                    <div className="flex items-center text-green-700 mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>Location is active - others can find you</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleDisableLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        <>
                          <MapPinOff className="h-3 w-3 mr-1" />
                          Disable Location
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!locationLoading && locationEnabled && !locationActive && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-md text-sm">
                    <div className="flex items-center text-yellow-700 mb-1">
                      <MapPinOff className="h-4 w-4 mr-1" />
                      <span>Location is disabled - you're not discoverable</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleEnableLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Enabling...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3 mr-1" />
                          Enable Location
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!locationLoading && !locationEnabled && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-md text-sm">
                    <div className="flex items-center text-yellow-700 mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>Location permission needed</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleEnableLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Requesting...
                        </>
                      ) : (
                        "Enable Location"
                      )}
                    </Button>
                  </div>
                )}
              </>
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
                    {nearbyUsers.map((user) => (
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
      )}

      {/* Right chat area */}
      {showChatArea && (
        <div className="flex-1 flex flex-col h-full">
          {selectedChat ? (
            <>
              {isMobile && (
                <div className="p-2 bg-white border-b border-gray-200">
                  <Button variant="ghost" size="sm" onClick={handleBackClick} className="flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to chats
                  </Button>
                </div>
              )}
              <div className="flex-1 flex flex-col h-full">
                <ChatArea userId={userId} chatId={selectedChat} />
              </div>
            </>
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
      )}
    </div>
  )
}
