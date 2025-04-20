"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { getChatMessages, sendMessage, markMessagesAsRead } from "@/app/actions/chats"

interface ChatAreaProps {
  userId: string
  chatId: string
}

export default function ChatArea({ userId, chatId }: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState("")
  const [otherUser, setOtherUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function fetchMessages() {
      try {
        const data = await getChatMessages({ userId, chatId })
        setMessages(data.messages)
        setOtherUser(data.otherUser)

        // Mark messages as read
        if (data.messages.some((m) => !m.read && m.sender !== userId)) {
          await markMessagesAsRead({ userId, chatId })
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
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
  }, [userId, chatId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageText.trim()) return

    try {
      await sendMessage({
        userId,
        chatId,
        content: messageText,
      })

      setMessageText("")

      // Fetch messages again to update the list
      const data = await getChatMessages({ userId, chatId })
      setMessages(data.messages)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <>
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-medium">{otherUser?.username || "Chat"}</h3>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message._id} className={`flex ${message.sender === userId ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender === userId ? "bg-blue-500 text-white" : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                <p>{message.content}</p>
                <div className={`text-xs mt-1 ${message.sender === userId ? "text-blue-100" : "text-gray-400"}`}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {message.sender === userId && <span className="ml-1">{message.read ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!messageText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  )
}
