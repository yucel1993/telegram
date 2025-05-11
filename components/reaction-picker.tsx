"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ReactionPickerProps {
  onSelectEmoji: (emoji: string) => void
  onClose: () => void
  position?: { top: number; left: number } | null
  className?: string
}

// Common emoji reactions
const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]

export default function ReactionPicker({ onSelectEmoji, onClose, position = null, className }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside the picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        onClose()
      }
    }

    // Add event listener with a slight delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Close the picker when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji)
    setIsOpen(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={pickerRef}
      className={cn(
        "fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 border border-gray-200 dark:border-gray-700",
        className,
      )}
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
      }}
      data-testid="reaction-picker"
    >
      {commonEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleEmojiClick(emoji)}
          className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md transition-colors"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
