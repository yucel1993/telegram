"use client"

import { useState, useEffect, useRef } from "react"
import { getUserChats } from "@/app/actions/chats"
import { Users } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface UserChatListProps {
  userId: string
  onSelectChat: (chatId: string) => void
  selectedChatId: string | null
}

export default function UserChatList({ userId, onSelectChat, selectedChatId }: UserChatListProps) {
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function fetchChats() {
      try {
        const userChats = await getUserChats({ userId })
        setChats(userChats)
      } catch (error) {
        console.error("Error fetching chats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()

    // Set up polling to refresh chats every 5 seconds
    pollingIntervalRef.current = setInterval(fetchChats, 5000)

    // Clean up interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [userId])

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-md"></div>
          ))}
        </div>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No conversations yet</p>
        <p className="text-sm mt-1">Search for users to start chatting</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {chats.map((chat) => (
        <div
          key={chat._id}
          className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedChatId === chat._id ? "bg-gray-100" : ""}`}
          onClick={() => onSelectChat(chat._id)}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <Avatar className="h-10 w-10 mr-3">
                {chat.isGroup ? (
                  chat.groupImage ? (
                    <AvatarImage src={chat.groupImage || "/placeholder.svg"} alt={chat.name || "Group"} />
                  ) : (
                    <AvatarFallback>
                      <Users className="h-5 w-5 text-gray-400" />
                    </AvatarFallback>
                  )
                ) : chat.otherUser?.profileImage ? (
                  <AvatarImage
                    src={chat.otherUser.profileImage || "/placeholder.svg"}
                    alt={chat.otherUser?.username || "User"}
                  />
                ) : (
                  <AvatarFallback>{chat.otherUser?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                )}
              </Avatar>
              <div>
                {chat.isGroup ? (
                  <div className="flex items-center">
                    <h3 className="font-medium">{chat.name || "Group Chat"}</h3>
                  </div>
                ) : (
                  <h3 className="font-medium">{chat.otherUser?.username || "Unknown User"}</h3>
                )}
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage ? chat.lastMessage.content : "No messages yet"}
                </p>
              </div>
            </div>
            {chat.lastMessage && (
              <span className="text-xs text-gray-400">
                {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          {chat.unreadCount > 0 && (
            <div className="mt-1 flex justify-end">
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">{chat.unreadCount}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
