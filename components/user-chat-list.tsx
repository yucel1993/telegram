"use client"

import { useState, useEffect, useRef, memo } from "react"
import { getUserChats } from "@/app/actions/chats"
import { Users } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Memoized Avatar component to prevent re-renders
const MemoizedAvatar = memo(({ chat }: { chat: any }) => {
  // Store the image URL in a ref to prevent re-renders
  const imageUrlRef = useRef<string | null>(null)

  // Only update the ref if the URL has changed
  if (chat.isGroup) {
    if (chat.groupImage && imageUrlRef.current !== chat.groupImage) {
      imageUrlRef.current = chat.groupImage
    }
  } else if (chat.otherUser?.profileImage && imageUrlRef.current !== chat.otherUser.profileImage) {
    imageUrlRef.current = chat.otherUser.profileImage
  }

  return (
    <Avatar className="h-10 w-10 mr-3">
      {chat.isGroup ? (
        chat.groupImage ? (
          <AvatarImage src={imageUrlRef.current || "/placeholder.svg"} alt={chat.name || "Group"} />
        ) : (
          <AvatarFallback>
            <Users className="h-5 w-5 text-gray-400" />
          </AvatarFallback>
        )
      ) : chat.otherUser?.profileImage ? (
        <AvatarImage src={imageUrlRef.current || "/placeholder.svg"} alt={chat.otherUser?.username || "User"} />
      ) : (
        <AvatarFallback>{chat.otherUser?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
      )}
    </Avatar>
  )
})

MemoizedAvatar.displayName = "MemoizedAvatar"

// Memoized ChatItem component to prevent re-renders
const ChatItem = memo(({ chat, isSelected, onSelect }: { chat: any; isSelected: boolean; onSelect: () => void }) => {
  return (
    <div className={`p-4 cursor-pointer hover:bg-gray-50 ${isSelected ? "bg-gray-100" : ""}`} onClick={onSelect}>
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <MemoizedAvatar chat={chat} />
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
  )
})

ChatItem.displayName = "ChatItem"

interface UserChatListProps {
  userId: string
  onSelectChat: (chatId: string) => void
  selectedChatId: string | null
}

export default function UserChatList({ userId, onSelectChat, selectedChatId }: UserChatListProps) {
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousChatsRef = useRef<string>("")

  useEffect(() => {
    async function fetchChats() {
      try {
        const userChats = await getUserChats({ userId })

        // Only update state if the chats have actually changed
        // This prevents unnecessary re-renders
        const chatsJson = JSON.stringify(
          userChats.map((chat) => ({
            _id: chat._id,
            isGroup: chat.isGroup,
            name: chat.name,
            lastMessage: chat.lastMessage
              ? {
                  content: chat.lastMessage.content,
                  createdAt: chat.lastMessage.createdAt,
                }
              : null,
            unreadCount: chat.unreadCount,
            otherUser: chat.otherUser
              ? {
                  _id: chat.otherUser._id,
                  username: chat.otherUser.username,
                  // Don't include profileImage in the comparison
                }
              : null,
          })),
        )

        if (chatsJson !== previousChatsRef.current) {
          previousChatsRef.current = chatsJson
          setChats(userChats)
        }
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
        <ChatItem
          key={chat._id}
          chat={chat}
          isSelected={selectedChatId === chat._id}
          onSelect={() => onSelectChat(chat._id)}
        />
      ))}
    </div>
  )
}
