"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ReactionPickerProps {
  onSelectEmoji: (emoji: string) => void
  onClose: () => void
  className?: string
}

// Common emoji reactions
const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]

export default function ReactionPicker({ onSelectEmoji, onClose, className }: ReactionPickerProps) {
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

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
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
        "absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      {commonEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleEmojiClick(emoji)}
          className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
