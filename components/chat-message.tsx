"use client"

import type React from "react"

import { useState, memo } from "react"
import { Smile, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import FilePreview from "./file-preview"
import ReactionPicker from "./reaction-picker"

interface ReactionGroup {
  emoji: string
  count: number
  users: { userId: string; username: string }[]
}

interface ChatMessageProps {
  message: any
  isCurrentUser: boolean
  isGroup: boolean
  userId: string
  onReactionAdd: (messageId: string, emoji: string) => void
  groupReactions: (reactions: any[]) => ReactionGroup[]
}

const ChatMessage = memo(
  ({ message, isCurrentUser, isGroup, userId, onReactionAdd, groupReactions }: ChatMessageProps) => {
    const [showReactionPicker, setShowReactionPicker] = useState(false)
    const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null)

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

    const handleReactionButtonClick = (event: React.MouseEvent) => {
      event.stopPropagation()

      // Calculate position for the picker
      const rect = event.currentTarget.getBoundingClientRect()

      // Position the picker above the message for current user, below for others
      const position = {
        top: isCurrentUser ? rect.top - 60 : rect.bottom + 10,
        left: isCurrentUser ? rect.left - 100 : rect.left,
      }

      setPickerPosition(position)
      setShowReactionPicker((prev) => !prev)
    }

    const handleSelectEmoji = (emoji: string) => {
      onReactionAdd(message._id, emoji)
      setShowReactionPicker(false)
    }

    return (
      <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} relative`}>
        <div className="relative group max-w-[70%]">
          <div
            className={cn(
              "p-3 rounded-lg",
              isCurrentUser
                ? `bg-blue-500 text-white ${message.optimistic ? "opacity-70" : ""}`
                : "bg-white text-gray-800 border border-gray-200 ml-1",
            )}
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
              onClick={handleReactionButtonClick}
              className={`absolute ${
                isCurrentUser ? "-left-8" : "-right-8"
              } top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white shadow-md hover:bg-gray-100`}
              aria-label="Add reaction"
            >
              <Smile className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Display reactions */}
          {reactionGroups.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              <TooltipProvider>
                {reactionGroups.map((group) => (
                  <Tooltip key={group.emoji}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onReactionAdd(message._id, group.emoji)}
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

          {/* Reaction picker */}
          {showReactionPicker && (
            <ReactionPicker
              onSelectEmoji={handleSelectEmoji}
              onClose={() => setShowReactionPicker(false)}
              position={pickerPosition}
            />
          )}
        </div>
      </div>
    )
  },
)

ChatMessage.displayName = "ChatMessage"

export default ChatMessage
