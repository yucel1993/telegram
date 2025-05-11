"use client"

import { memo, useState, useEffect, useRef, type ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"

interface MemoizedAvatarProps {
  src: string | null | undefined
  fallback: ReactNode // Changed from string to ReactNode to accept React elements
  alt: string
  className?: string
  isGroup?: boolean
}

const MemoizedAvatar = memo(
  ({ src, fallback, alt, className = "h-10 w-10", isGroup = false }: MemoizedAvatarProps) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [error, setError] = useState(false)
    const prevSrcRef = useRef<string | null | undefined>(null)

    // Only update the image loaded state if the src changes
    useEffect(() => {
      if (src !== prevSrcRef.current) {
        setImageLoaded(false)
        setError(false)
        prevSrcRef.current = src
      }
    }, [src])

    return (
      <Avatar className={`${className} rounded-full`}>
        {src && !error ? (
          <AvatarImage
            src={src || "/placeholder.svg"}
            alt={alt}
            className="rounded-full"
            onLoad={() => setImageLoaded(true)}
            onError={() => setError(true)}
            style={{ opacity: imageLoaded ? 1 : 0, transition: "opacity 0.2s" }}
          />
        ) : null}
        <AvatarFallback className="rounded-full">
          {isGroup ? <Users className="h-5 w-5 text-gray-400" /> : fallback}
        </AvatarFallback>
      </Avatar>
    )
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.className === nextProps.className &&
      prevProps.isGroup === nextProps.isGroup &&
      // For src, we want to consider null and undefined as equal
      // to prevent re-renders when the image is still loading
      ((!prevProps.src && !nextProps.src) || prevProps.src === nextProps.src)
      // Note: We can't easily compare React nodes (fallback), so we'll let React handle that
    )
  },
)

MemoizedAvatar.displayName = "MemoizedAvatar"

export default MemoizedAvatar
