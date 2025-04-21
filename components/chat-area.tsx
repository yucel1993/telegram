"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ArrowDown, ArrowLeft, Users, Info, UserPlus } from "lucide-react"
import { getChatMessages, sendMessage, markMessagesAsRead } from "@/app/actions/chats"
import { joinGroup } from "@/app/actions/groups"
import { useMobile } from "@/hooks/use-mobile"

interface ChatAreaProps {
  userId: string
  chatId: string
  onBack?: () => void
}

export default function ChatArea({ userId, chatId, onBack }: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState("")
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isGroup, setIsGroup] = useState(false)
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [chatInitialized, setChatInitialized] = useState(false)
  const [isGroupMember, setIsGroupMember] = useState(true)
  const [joiningGroup, setJoiningGroup] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastMessageCountRef = useRef(0)
  const isMobile = useMobile()

  useEffect(() => {
    async function fetchMessages() {
      try {
        const data = await getChatMessages({ userId, chatId })

        if (data.messages && Array.isArray(data.messages)) {
          // Only auto-scroll if new messages have been added
          const shouldAutoScroll = autoScroll && data.messages.length > lastMessageCountRef.current

          setMessages(data.messages)
          lastMessageCountRef.current = data.messages.length

          // If we should auto-scroll, do it after the state update
          if (shouldAutoScroll) {
            setTimeout(() => {
              scrollToBottom(false)
            }, 100)
          }
        }

        // Set group info if it's a group chat
        if (data.isGroup) {
          setIsGroup(true)
          setGroupInfo({
            name: data.name,
            description: data.description,
            admins: data.admins,
          })
          setParticipants(data.participants || [])

          // Check if the current user is a member of the group
          // Fix the type error by ensuring we always set a boolean value
          const isMember = data.participants ? data.participants.some((p: any) => p._id === userId) : false
          setIsGroupMember(isMember)
        } else {
          setIsGroup(false)
          setOtherUser(data.otherUser)
          setIsGroupMember(true) // Always a member in direct chats
        }

        setChatInitialized(true)

        // Mark messages as read
        if (data.messages && data.messages.some((m: any) => !m.read && m.sender !== userId)) {
          await markMessagesAsRead({ userId, chatId })
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
        // Even if there's an error, we should still set chatInitialized to true
        // so the UI doesn't get stuck in a loading state
        setChatInitialized(true)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up polling to refresh messages every 3 seconds
    pollingIntervalRef.current = setInterval(fetchMessages, 3000)

    // Clean up interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [userId, chatId, autoScroll])

  // Handle scroll events to detect when user manually scrolls
  useEffect(() => {
    const container = messagesContainerRef.current

    if (!container) return

    const handleScroll = () => {
      // If the user scrolls up, disable auto-scroll
      if (container.scrollTop < container.scrollHeight - container.clientHeight - 100) {
        setAutoScroll(false)
        setShowScrollButton(true)
      } else {
        // If the user scrolls to the bottom, enable auto-scroll again
        setAutoScroll(true)
        setShowScrollButton(false)
      }
    }

    container.addEventListener("scroll", handleScroll)

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Function to scroll to bottom
  const scrollToBottom = (enableAutoScroll = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }

    if (enableAutoScroll) {
      setAutoScroll(true)
      setShowScrollButton(false)
    }
  }

  // When adding a new message, scroll to bottom
  useEffect(() => {
    if (sending && autoScroll) {
      scrollToBottom(false)
    }
  }, [messages, sending, autoScroll])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageText.trim() || sending) return

    try {
      setSending(true)

      // Optimistically add message to UI
      const optimisticMessage = {
        _id: Date.now().toString(),
        sender: userId,
        content: messageText,
        read: false,
        createdAt: new Date().toISOString(),
        optimistic: true,
        senderName: "You", // For group chats
      }

      setMessages((prev) => [...prev, optimisticMessage])
      setMessageText("")

      // Enable auto-scroll when sending a message
      setAutoScroll(true)

      // Scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom(false)
      }, 100)

      // Focus the input field after sending
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)

      // Send message to server
      const result = await sendMessage({
        userId,
        chatId,
        content: messageText.trim(),
      })

      if (!result.success) {
        console.error("Failed to send message:", result.error)
        // Remove optimistic message if failed
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id))
      } else {
        // Fetch messages again to update the list with the actual message
        const data = await getChatMessages({ userId, chatId })
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages)
          lastMessageCountRef.current = data.messages.length
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleJoinGroup = async () => {
    if (joiningGroup) return

    setJoiningGroup(true)
    try {
      const result = await joinGroup({
        userId,
        chatId,
      })

      if (result.success) {
        setIsGroupMember(true)
        // Refresh messages to update participants list
        const data = await getChatMessages({ userId, chatId })
        if (data.participants) {
          setParticipants(data.participants)
        }
      } else {
        console.error("Failed to join group:", result.error)
      }
    } catch (error) {
      console.error("Error joining group:", error)
    } finally {
      setJoiningGroup(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Always show the chat UI, even if there are no messages yet
  return (
    <div className="flex flex-col h-full">
      {/* Chat header - Sticky */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        {isMobile && onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to chats
          </Button>
        )}

        {isGroup ? (
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-500" />
            <h3 className="font-medium">{groupInfo?.name || "Group Chat"}</h3>
            {groupInfo?.description && (
              <div className="ml-2 text-gray-500 text-sm flex items-center">
                <Info className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[200px]">{groupInfo.description}</span>
              </div>
            )}
          </div>
        ) : (
          <h3 className="font-medium">{otherUser?.username || "New Chat"}</h3>
        )}
      </div>

      {/* Messages area - Add padding-top to prevent messages from being hidden under the header */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pt-6 bg-gray-50 relative">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((message, index) => {
              // Check if this is a new sender compared to the previous message
              const isNewSender = index === 0 || messages[index - 1].sender !== message.sender
              const isCurrentUser = message.sender === userId

              // Handle system messages differently
              if (message.isSystemMessage) {
                return (
                  <div key={message._id || index} className="flex justify-center">
                    <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">{message.content}</div>
                  </div>
                )
              }

              return (
                <div key={message._id || index} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      isCurrentUser
                        ? `bg-blue-500 text-white ${message.optimistic ? "opacity-70" : ""}`
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    {/* Show sender name for group chats if it's not the current user or if it's a new sender */}
                    {isGroup && !isCurrentUser && isNewSender && (
                      <div className="text-xs font-medium mb-1 text-gray-500">
                        {message.senderName || "Unknown User"}
                      </div>
                    )}
                    <p className="break-words">{message.content}</p>
                    <div className={`text-xs mt-1 ${isCurrentUser ? "text-blue-100" : "text-gray-400"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isCurrentUser && <span className="ml-1">{message.read ? "✓✓" : "✓"}</span>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-md"
            size="icon"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Message input or Join Group button */}
      <div className="p-4 border-t border-gray-200 bg-white mt-auto">
        {isGroup && !isGroupMember ? (
          <Button onClick={handleJoinGroup} className="w-full flex items-center justify-center" disabled={joiningGroup}>
            <UserPlus className="h-4 w-4 mr-2" />
            {joiningGroup ? "Joining..." : "Join Group to Send Messages"}
          </Button>
        ) : (
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
              onFocus={() => {
                // On mobile, wait a bit for the keyboard to appear, then scroll
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.scrollIntoView({ behavior: "smooth" })
                  }
                }, 300)
              }}
            />
            <Button type="submit" disabled={!messageText.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
