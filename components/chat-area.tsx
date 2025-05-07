"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  ArrowDown,
  ArrowLeft,
  Users,
  Info,
  UserPlus,
  Trash2,
  LogOut,
  MoreVertical,
  X,
  Paperclip,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getChatMessages, sendMessage, markMessagesAsRead, deleteChat } from "@/app/actions/chats"
import { joinGroup } from "@/app/actions/groups"
import { useMobile } from "@/hooks/use-mobile"
import FilePreview from "@/components/file-preview"
import { uploadFile } from "@/app/actions/upload"
import { cn } from "@/lib/utils"

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
  const [isGroupAdmin, setIsGroupAdmin] = useState(false)
  const [joiningGroup, setJoiningGroup] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileAttachment, setFileAttachment] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastMessageCountRef = useRef(0)
  const isMobile = useMobile()

  // Process messages to ensure consistent styling
  const processMessages = (msgs: any[]) => {
    return msgs.map((msg) => {
      // Clone the message to avoid mutating the original
      const processedMsg = { ...msg }

      // Add a flag to identify user messages for styling
      if (processedMsg.sender === userId) {
        processedMsg.isUserMessage = true
      }

      return processedMsg
    })
  }

  useEffect(() => {
    async function fetchMessages() {
      try {
        const data = await getChatMessages({ userId, chatId })

        if (data.messages && Array.isArray(data.messages)) {
          // Only auto-scroll if new messages have been added
          const shouldAutoScroll = autoScroll && data.messages.length > lastMessageCountRef.current

          // Process messages to ensure consistent styling
          setMessages(processMessages(data.messages))

          // Always scroll to bottom on initial load
          if (loading) {
            setTimeout(() => {
              scrollToBottom(false)
            }, 100)
          }
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

          // Check if the current user is an admin
          setIsGroupAdmin(data.isAdmin || false)
        } else {
          setIsGroup(false)
          setOtherUser(data.otherUser)
          setIsGroupMember(true) // Always a member in direct chats
          setIsGroupAdmin(false)
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
  }, [userId, chatId, autoScroll, loading])

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

    if ((!messageText.trim() && !fileAttachment) || sending) return

    try {
      setSending(true)

      // Optimistically add message to UI
      const optimisticMessage = {
        _id: Date.now().toString(),
        sender: userId,
        content: messageText || "", // Empty string if no text
        read: false,
        createdAt: new Date().toISOString(),
        optimistic: true,
        senderName: "You", // For group chats
        fileAttachment: fileAttachment,
        isUserMessage: true, // Flag for styling
      }

      setMessages((prev) => [...prev, optimisticMessage])
      setMessageText("")
      // Clear the file attachment immediately after sending
      setFileAttachment(null)

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
        content: messageText.trim(), // Just send the actual text
        fileAttachment: fileAttachment,
      })

      if (!result.success) {
        console.error("Failed to send message:", result.error)
        // Remove optimistic message if failed
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id))
      } else {
        // Fetch messages again to update the list with the actual message
        const data = await getChatMessages({ userId, chatId })
        if (data.messages && Array.isArray(data.messages)) {
          // Process messages to ensure consistent styling
          setMessages(processMessages(data.messages))
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

  const handleDeleteChat = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteChat({
        userId,
        chatId,
      })

      if (result.success) {
        // Navigate back to the chat list
        if (onBack) {
          onBack()
        }
      } else {
        console.error("Failed to delete chat:", result.error)
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setShowLeaveDialog(false)
    }
  }

  const handleFileUploaded = (fileData: any) => {
    setFileAttachment(fileData)
    setUploadingFile(false)
    // Don't set default message text anymore
  }

  const handleCancelUpload = () => {
    setUploadingFile(false)
    setFileAttachment(null)
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isMobile && onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="mr-2 flex items-center">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
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

          {/* Chat actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isGroup ? (
                <>
                  {isGroupMember && (
                    <DropdownMenuItem onClick={() => setShowLeaveDialog(true)} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Group
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Chat
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              const isCurrentUser = message.sender === userId || message.isUserMessage

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
                    className={cn(
                      "p-3 rounded-lg",
                      isCurrentUser
                        ? `bg-blue-500 text-white ${message.optimistic ? "opacity-70" : ""}`
                        : "bg-white text-gray-800 border border-gray-200 ml-1",
                      // Apply different classes based on mobile/desktop and sender
                      isCurrentUser && isMobile
                        ? "user-message-mobile" // Special class for mobile user messages
                        : isCurrentUser
                          ? "mr-4 max-w-[70%]"
                          : "max-w-[70%]",
                    )}
                    style={isCurrentUser && isMobile ? { marginRight: "16px" } : {}}
                  >
                    {/* Show sender name for group chats if it's not the current user */}
                    {isGroup && !isCurrentUser && (
                      <div className="text-xs font-medium mb-1 text-gray-500">
                        {message.senderName || "Unknown User"}
                      </div>
                    )}

                    {/* Message content */}
                    {message.content && <p className="break-words">{message.content}</p>}

                    {/* File attachment if present */}
                    {message.fileAttachment && (
                      <div
                        className={`mt-2 ${isCurrentUser ? "bg-blue-600" : "bg-gray-50"} rounded-md overflow-hidden`}
                      >
                        <FilePreview fileAttachment={message.fileAttachment} />
                      </div>
                    )}

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

      {/* File attachment preview */}
      {fileAttachment && (
        <div className="px-4 pt-2 bg-white">
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <div className="truncate max-w-[200px]">{fileAttachment.originalFilename}</div>
              <Button variant="ghost" size="sm" onClick={handleCancelUpload} disabled={sending}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-center text-green-600">Ready to send</div>
          </div>
        </div>
      )}

      {/* Message input or Join Group button */}
      <div className="p-4 border-t border-gray-200 bg-white mt-auto">
        {isGroup && !isGroupMember ? (
          <Button onClick={handleJoinGroup} className="w-full flex items-center justify-center" disabled={joiningGroup}>
            <UserPlus className="h-4 w-4 mr-2" />
            {joiningGroup ? "Joining..." : "Join Group to Send Messages"}
          </Button>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className={cn("flex items-center space-x-2", isMobile && "mobile-form-container")}
          >
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={fileAttachment ? "Add a message (optional)" : "Type a message..."}
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

            {/* File upload button - now positioned between input and send button with consistent size */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 p-0 flex-shrink-0"
              type="button"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadingFile(true)
                  const formData = new FormData()
                  formData.append("file", e.target.files[0])
                  uploadFile(formData)
                    .then((result) => {
                      if (result.success) {
                        handleFileUploaded(result.file)
                      } else {
                        console.error("Upload failed:", result.error)
                        handleCancelUpload()
                      }
                    })
                    .catch((error) => {
                      console.error("Error uploading file:", error)
                      handleCancelUpload()
                    })
                    .finally(() => {
                      e.target.value = ""
                    })
                }
              }}
              accept="audio/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/*"
            />

            <Button
              type="submit"
              disabled={(messageText.trim() === "" && !fileAttachment) || sending}
              size="icon"
              className={cn("h-10 w-10", isMobile && "mobile-send-button")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>

      {/* Delete Chat Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You will need to be added back by a member to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Leaving..." : "Leave Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
