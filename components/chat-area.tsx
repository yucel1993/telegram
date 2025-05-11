"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react"
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
  Clock,
  Smile,
  Mic,
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
import { getUserOnlineStatus } from "@/app/actions/users"
import { addReaction } from "@/app/actions/reactions"
import { useMobile } from "@/hooks/use-mobile"
import FilePreview from "@/components/file-preview"
import { uploadFile } from "@/app/actions/upload"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import MemoizedAvatar from "./memoized-avatar"
import ReactionPicker from "./reaction-picker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


interface ChatAreaProps {
  userId: string
  chatId: string
  onBack?: () => void
}

interface ReactionGroup {
  emoji: string
  count: number
  users: { userId: string; username: string }[]
}

// Memoized Message component to prevent re-renders
const Message = memo(
  ({
    message,
    isCurrentUser,
    isGroup,
    handleOpenReactionPicker,
    groupReactions,
    handleSelectEmoji,
    userId,
  }: {
    message: any
    isCurrentUser: boolean
    isGroup: boolean
    handleOpenReactionPicker: (messageId: string, event: React.MouseEvent) => void
    groupReactions: (reactions: any[]) => ReactionGroup[]
    handleSelectEmoji: (emoji: string) => void
    userId: string
  }) => {
    // Handle system messages differently
    if (message.isSystemMessage) {
      return (
        <div className="flex justify-center">
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">{message.content}</div>
        </div>
      )
    }

    // Group reactions by emoji
    const reactionGroups = groupReactions(message.reactions)

    return (
      <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
        <div className="relative group">
          <div
            className={cn(
              "p-3 rounded-lg",
              isCurrentUser
                ? `bg-blue-500 text-white ${message.optimistic ? "opacity-70" : ""}`
                : "bg-white text-gray-800 border border-gray-200 ml-1",
              isCurrentUser ? "mr-12" : "max-w-[70%]",
            )}
            style={{
              maxWidth: "70%",
              ...(isCurrentUser && { marginRight: "48px" }),
            }}
          >
            {isGroup && !isCurrentUser && (
              <div className="text-xs font-medium mb-1 text-gray-500">{message.senderName || "Unknown User"}</div>
            )}

            {/* Message content - ensure it's not split */}
            {message.content && <p className="break-words whitespace-pre-wrap">{message.content}</p>}

            {/* File attachment if present */}
            {message.fileAttachment && (
              <div className={`mt-2 ${isCurrentUser ? "bg-blue-600" : "bg-gray-50"} rounded-md overflow-hidden`}>
                {message.fileAttachment.isVoiceMessage ? (
                  <div className={`p-2 ${isCurrentUser ? "text-white" : "text-gray-800"}`}>
                    <div className="flex items-center">
                      <Mic className="h-4 w-4 mr-2" />
                      <span className="text-xs">Voice message</span>
                    </div>
                    <audio
                      src={message.fileAttachment.url}
                      controls
                      className="w-full mt-1 h-8"
                      controlsList="nodownload"
                    />
                  </div>
                ) : (
                  <FilePreview fileAttachment={message.fileAttachment} />
                )}
              </div>
            )}

            <div className={`text-xs mt-1 ${isCurrentUser ? "text-blue-100" : "text-gray-400"}`}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {isCurrentUser && <span className="ml-1">{message.read ? "✓✓" : "✓"}</span>}
            </div>

            {/* Reaction button - only visible on hover */}
            <button
              onClick={(e) => handleOpenReactionPicker(message._id, e)}
              className={`absolute ${
                isCurrentUser ? "-left-8" : "-right-8"
              } top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white shadow-md hover:bg-gray-100`}
            >
              <Smile className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Display reactions */}
          {reactionGroups.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? "justify-end mr-12" : "justify-start"}`}>
              <TooltipProvider>
                {reactionGroups.map((group) => (
                  <Tooltip key={group.emoji}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleSelectEmoji(group.emoji)}
                        className="flex items-center bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs hover:bg-gray-50"
                      >
                        <span className="mr-1">{group.emoji}</span>
                        <span>{group.count}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{group.users.map((user) => user.username).join(", ")}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    )
  },
)

Message.displayName = "Message"

// Memoized chat header component to prevent re-renders
const ChatHeader = memo(
  ({
    isGroup,
    groupInfo,
    groupImage,
    otherUser,
    otherUserOnlineStatus,
    formatLastActive,
    isMobile,
    onBack,
  }: {
    isGroup: boolean
    groupInfo: any
    groupImage: string | null
    otherUser: any
    otherUserOnlineStatus: { isOnline: boolean; lastActive: Date | null }
    formatLastActive: (date: Date | null) => string
    isMobile: boolean
    onBack?: () => void
  }) => {
    return (
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
                <MemoizedAvatar
                  src={groupImage}
                  fallback={<Users className="h-5 w-5 text-gray-400" />}
                  alt={groupInfo?.name || "Group Chat"}
                  isGroup={true}
                />
                <div className="ml-3">
                  <h3 className="font-medium">{groupInfo?.name || "Group Chat"}</h3>
                  {groupInfo?.description && (
                    <div className="text-sm text-gray-500 flex items-center">
                      <Info className="h-3 w-3 mr-1" />
                      <span className="truncate max-w-[200px]">{groupInfo.description}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <MemoizedAvatar
                  src={otherUser?.profileImage}
                  fallback={otherUser?.username?.charAt(0).toUpperCase() || "U"}
                  alt={otherUser?.username || "User"}
                />
                <div className="ml-3">
                  <h3 className="font-medium">{otherUser?.username || "New Chat"}</h3>
                  <div className="text-xs text-gray-500 flex items-center">
                    {otherUserOnlineStatus.isOnline ? (
                      <span className="flex items-center text-green-600">
                        <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {otherUserOnlineStatus.lastActive
                          ? `Last active ${formatLastActive(otherUserOnlineStatus.lastActive)}`
                          : "Offline"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
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
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Chat
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // For group chats
    if (prevProps.isGroup && nextProps.isGroup) {
      return (
        prevProps.groupInfo?.name === nextProps.groupInfo?.name &&
        prevProps.groupInfo?.description === nextProps.groupInfo?.description &&
        prevProps.groupImage === nextProps.groupImage
      )
    }

    // For direct chats
    if (!prevProps.isGroup && !nextProps.isGroup) {
      return (
        prevProps.otherUser?.username === nextProps.otherUser?.username &&
        prevProps.otherUser?.profileImage === nextProps.otherUser?.profileImage &&
        prevProps.otherUserOnlineStatus.isOnline === nextProps.otherUserOnlineStatus.isOnline &&
        prevProps.otherUserOnlineStatus.lastActive?.getTime() === nextProps.otherUserOnlineStatus.lastActive?.getTime()
      )
    }

    // If isGroup changed, we need to re-render
    return false
  },
)

ChatHeader.displayName = "ChatHeader"

export default function ChatArea({ userId, chatId, onBack }: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState("")
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isGroup, setIsGroup] = useState(false)
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [groupImage, setGroupImage] = useState<string | null>(null)
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
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [reactionPickerState, setReactionPickerState] = useState<{
    isOpen: boolean
    messageId: string | null
    position: { top: number; left: number } | null
  }>({
    isOpen: false,
    messageId: null,
    position: null,
  })
  const [otherUserOnlineStatus, setOtherUserOnlineStatus] = useState<{
    isOnline: boolean
    lastActive: Date | null
  }>({
    isOnline: false,
    lastActive: null,
  })

  // Refs for caching and preventing unnecessary re-renders
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const onlineStatusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastMessageCountRef = useRef(0)
  const lastMessagesJsonRef = useRef<string>("")
  const otherUserRef = useRef<any>(null)
  const groupInfoRef = useRef<any>(null)
  const groupImageRef = useRef<string | null>(null)
  const isMobile = useMobile()
  const initialFetchDoneRef = useRef(false)

  // Process messages to ensure consistent styling
  const processMessages = useCallback(
    (msgs: any[]) => {
      return msgs.map((msg) => {
        // Clone the message to avoid mutating the original
        const processedMsg = { ...msg }

        // Add a flag to identify user messages for styling
        if (processedMsg.sender === userId) {
          processedMsg.isUserMessage = true
        }

        return processedMsg
      })
    },
    [userId],
  )

  // Format last active time - memoized to prevent unnecessary re-renders
  const formatLastActive = useCallback((date: Date | null) => {
    if (!date) return "Unknown"
    return formatDistanceToNow(date, { addSuffix: true })
  }, [])

  // Fetch messages and chat info
  const fetchMessages = useCallback(async () => {
    try {
      const data = await getChatMessages({ userId, chatId })

      if (data.messages && Array.isArray(data.messages)) {
        // Process messages to ensure consistent styling
        const processedMessages = processMessages(data.messages)

        // Convert to JSON for comparison
        const messagesJson = JSON.stringify(processedMessages)

        // Only update state if messages have actually changed
        // This prevents unnecessary re-renders
        if (messagesJson !== lastMessagesJsonRef.current) {
          lastMessagesJsonRef.current = messagesJson

          // Only auto-scroll if new messages have been added
          const shouldAutoScroll = autoScroll && data.messages.length > lastMessageCountRef.current

          setMessages(processedMessages)

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
      }

      // Set group info if it's a group chat
      if (data.isGroup) {
        setIsGroup(true)

        // Only update group info if it has changed
        const newGroupInfo = {
          name: data.name,
          description: data.description,
          admins: data.admins,
        }

        // Use JSON.stringify for deep comparison
        if (JSON.stringify(newGroupInfo) !== JSON.stringify(groupInfoRef.current)) {
          groupInfoRef.current = newGroupInfo
          setGroupInfo(newGroupInfo)
        }

        // Set participants
        setParticipants(data.participants || [])

        // Set group image if available and changed
        if (data.groupImage && data.groupImage !== groupImageRef.current) {
          groupImageRef.current = data.groupImage
          setGroupImage(data.groupImage)
        }

        // Check if the current user is a member of the group
        const isMember = data.participants ? data.participants.some((p: any) => p._id === userId) : false
        setIsGroupMember(isMember)

        // Check if the current user is an admin
        setIsGroupAdmin(data.isAdmin || false)
      } else {
        setIsGroup(false)

        // Only update other user if it has changed
        if (JSON.stringify(data.otherUser) !== JSON.stringify(otherUserRef.current)) {
          otherUserRef.current = data.otherUser
          setOtherUser(data.otherUser)
        }

        setIsGroupMember(true) // Always a member in direct chats
        setIsGroupAdmin(false)

        // If it's a direct chat, fetch the other user's online status
        if (data.otherUser && data.otherUser._id) {
          fetchOtherUserOnlineStatus(data.otherUser._id)
        }
      }

      setChatInitialized(true)
      initialFetchDoneRef.current = true

      // Mark messages as read
      if (data.messages && data.messages.some((m: any) => !m.read && m.sender !== userId)) {
        await markMessagesAsRead({ userId, chatId })
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      // Even if there's an error, we should still set chatInitialized to true
      // so the UI doesn't get stuck in a loading state
      setChatInitialized(true)
      initialFetchDoneRef.current = true
    } finally {
      setLoading(false)
    }
  }, [userId, chatId, autoScroll, loading, processMessages])

  // Initial fetch and polling setup
  useEffect(() => {
    // Initial fetch
    fetchMessages()

    // Set up polling to refresh messages every 3 seconds
    pollingIntervalRef.current = setInterval(fetchMessages, 3000)

    // Clean up interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (onlineStatusIntervalRef.current) {
        clearInterval(onlineStatusIntervalRef.current)
      }
    }
  }, [fetchMessages])

  // Fetch other user's online status
  const fetchOtherUserOnlineStatus = async (otherUserId: string) => {
    try {
      const result = await getUserOnlineStatus({ userId: otherUserId })
      if (result.success) {
        setOtherUserOnlineStatus({
          isOnline: result.isOnline,
          lastActive: result.lastActive ? new Date(result.lastActive) : null,
        })
      }
    } catch (error) {
      console.error("Error fetching online status:", error)
    }
  }

  // Set up polling for online status
  useEffect(() => {
    if (!isGroup && otherUser?._id) {
      // Initial fetch
      fetchOtherUserOnlineStatus(otherUser._id)

      // Set up polling every 30 seconds
      onlineStatusIntervalRef.current = setInterval(() => {
        fetchOtherUserOnlineStatus(otherUser._id)
      }, 30000)

      return () => {
        if (onlineStatusIntervalRef.current) {
          clearInterval(onlineStatusIntervalRef.current)
        }
      }
    }
  }, [isGroup, otherUser])

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
        reactions: [],
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

      // Send message to server - ensure we send the complete message
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
        await fetchMessages()
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
        await fetchMessages()
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
  }

  const handleCancelUpload = () => {
    setUploadingFile(false)
    setFileAttachment(null)
  }

  const handleVoiceRecorded = (fileData: any) => {
    console.log("Voice message recorded:", fileData)

    // Set the file attachment
    setFileAttachment({
      ...fileData,
      type: "audio/webm",
      isVoiceMessage: true, // Add a flag to identify voice messages
    })

    // Close the voice recorder
    setShowVoiceRecorder(false)

    // Auto-send the voice message after a short delay
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent
      handleSendMessage(fakeEvent)
    }, 300)
  }

  // Handle opening the reaction picker
  const handleOpenReactionPicker = useCallback(
    (messageId: string, event: React.MouseEvent) => {
      // Close the picker if it's already open for this message
      if (reactionPickerState.isOpen && reactionPickerState.messageId === messageId) {
        setReactionPickerState({
          isOpen: false,
          messageId: null,
          position: null,
        })
        return
      }

      // Calculate position for the picker
      const rect = event.currentTarget.getBoundingClientRect()
      const position = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      }

      setReactionPickerState({
        isOpen: true,
        messageId,
        position,
      })
    },
    [reactionPickerState.isOpen, reactionPickerState.messageId],
  )

  // Handle selecting an emoji
  const handleSelectEmoji = async (emoji: string) => {
    if (!reactionPickerState.messageId) return

    try {
      // Optimistically update the UI
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message._id === reactionPickerState.messageId) {
            // Check if the user has already reacted with this emoji
            const existingReactionIndex = message.reactions?.findIndex(
              (r: any) => r.userId === userId && r.emoji === emoji,
            )

            const updatedReactions = [...(message.reactions || [])]

            if (existingReactionIndex >= 0) {
              // Remove the reaction if it already exists
              updatedReactions.splice(existingReactionIndex, 1)
            } else {
              // Add the reaction
              updatedReactions.push({
                emoji,
                userId,
                username: "You", // Temporary username for optimistic update
              })
            }

            return {
              ...message,
              reactions: updatedReactions,
            }
          }
          return message
        }),
      )

      // Send the reaction to the server
      await addReaction({
        userId,
        chatId,
        messageId: reactionPickerState.messageId,
        emoji,
      })

      // Close the reaction picker
      setReactionPickerState({
        isOpen: false,
        messageId: null,
        position: null,
      })
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  // Group reactions by emoji
  const groupReactions = useCallback((reactions: any[] = []): ReactionGroup[] => {
    const groups: { [key: string]: ReactionGroup } = {}

    reactions.forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        }
      }

      groups[reaction.emoji].count++
      groups[reaction.emoji].users.push({
        userId: reaction.userId,
        username: reaction.username,
      })
    })

    return Object.values(groups)
  }, [])

  // Memoized chat header props to prevent unnecessary re-renders
  const chatHeaderProps = useMemo(() => {
    return {
      isGroup,
      groupInfo,
      groupImage,
      otherUser,
      otherUserOnlineStatus,
      formatLastActive,
      isMobile,
      onBack,
    }
  }, [isGroup, groupInfo, groupImage, otherUser, otherUserOnlineStatus, formatLastActive, isMobile, onBack])

  // Show loading state only on initial load
  if (loading && !initialFetchDoneRef.current) {
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
      <ChatHeader {...chatHeaderProps} />

      {/* Messages area - Increase padding-top to prevent messages from being hidden under the header */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pt-10 bg-gray-50 relative">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((message, index) => {
              // Check if this is a new sender compared to the previous message
              const isCurrentUser = message.sender === userId || message.isUserMessage

              return (
                <Message
                  key={message._id || index}
                  message={message}
                  isCurrentUser={isCurrentUser}
                  isGroup={isGroup}
                  handleOpenReactionPicker={handleOpenReactionPicker}
                  groupReactions={groupReactions}
                  handleSelectEmoji={handleSelectEmoji}
                  userId={userId}
                />
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

        {/* Reaction picker */}
        {reactionPickerState.isOpen && reactionPickerState.position && (
          <ReactionPicker
            onSelectEmoji={handleSelectEmoji}
            onClose={() => setReactionPickerState({ isOpen: false, messageId: null, position: null })}
            className="bottom-16 left-1/2 transform -translate-x-1/2"
          />
        )}
      </div>

   

      {/* File attachment preview */}
      {fileAttachment && !showVoiceRecorder && (
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
      {!showVoiceRecorder && (
        <div className="p-4 border-t border-gray-200 bg-white mt-auto">
          {isGroup && !isGroupMember ? (
            <Button
              onClick={handleJoinGroup}
              className="w-full flex items-center justify-center"
              disabled={joiningGroup}
            >
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

              {/* Voice message button */}
              {/* <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 p-0 flex-shrink-0"
                type="button"
                onClick={() => {
                  console.log("Opening voice recorder")
                  setShowVoiceRecorder(true)
                }}
              >
                <Mic className="h-4 w-4" />
              </Button> */}

              {/* File upload button */}
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
                accept="audio/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/application/vnd.mspowerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/*"
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
      )}

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
