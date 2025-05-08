"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getChatMedia } from "@/app/actions/chats"
import { getFileUrl } from "@/app/actions/files"
import { FileText, FileAudio, FileVideo, File, Download, Loader2 } from "lucide-react"

interface ChatMediaProps {
  userId: string
  chatId: string
}

export default function ChatMedia({ userId, chatId }: ChatMediaProps) {
  const [loading, setLoading] = useState(true)
  const [media, setMedia] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "images" | "files">("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMedia()
  }, [chatId, userId])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const result = await getChatMedia({ userId, chatId })
      if (result.success) {
        setMedia(result.media || [])
      } else {
        setError("Failed to load media")
      }
    } catch (error) {
      console.error("Error fetching media:", error)
      setError("Failed to load media")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (s3Key: string, originalFilename: string) => {
    try {
      const result = await getFileUrl(s3Key)
      if (result.success && result.url) {
        // Create a temporary link and trigger download
        const link = document.createElement("a")
        link.href = result.url
        link.download = originalFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Error downloading file:", error)
    }
  }

  const filteredMedia = media.filter((item) => {
    if (activeTab === "all") return true
    if (activeTab === "images") return item.fileType === "image"
    if (activeTab === "files") return item.fileType !== "image"
    return true
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <div className="text-center text-red-500 py-4">{error}</div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No media found</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredMedia.map((item, index) => {
            const isImage = item.fileType === "image"

            if (isImage) {
              return (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={item.url || "/placeholder.svg?height=200&width=200"}
                      alt={item.originalFilename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => handleDownload(item.s3Key, item.originalFilename)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            } else {
              // File icon based on type
              let FileIcon = File
              if (item.fileType === "audio") FileIcon = FileAudio
              else if (item.fileType === "video") FileIcon = FileVideo
              else if (item.fileType === "document") FileIcon = FileText

              return (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-md flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-gray-100"
                  onClick={() => handleDownload(item.s3Key, item.originalFilename)}
                >
                  <FileIcon className="h-8 w-8 mb-2 text-blue-500" />
                  <div className="text-xs text-center truncate w-full">{item.originalFilename}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatFileSize(item.size)}</div>
                </div>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
