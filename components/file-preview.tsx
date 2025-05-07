"use client"

import { useState, useEffect } from "react"
import { getFileUrl } from "@/app/actions/files"
import { FileText, FileAudio, FileVideo, File, Download, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FilePreviewProps {
  fileAttachment: {
    filename: string
    originalFilename: string
    mimeType: string
    size: number
    s3Key: string
    fileType: string
  }
}

export default function FilePreview({ fileAttachment }: FilePreviewProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFileUrl() {
      try {
        setLoading(true)
        const result = await getFileUrl(fileAttachment.s3Key)

        if (result.success && result.url) {
          setFileUrl(result.url)
        } else {
          setError("Failed to load file")
        }
      } catch (error) {
        console.error("Error fetching file URL:", error)
        setError("Failed to load file")
      } finally {
        setLoading(false)
      }
    }

    fetchFileUrl()
  }, [fileAttachment.s3Key])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !fileUrl) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-red-500 text-sm">Failed to load file</div>
      </div>
    )
  }

  // Render based on file type
  switch (fileAttachment.fileType) {
    case "audio":
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <FileAudio className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm font-medium truncate text-gray-800">{fileAttachment.originalFilename}</span>
          </div>
          <audio controls className="w-full">
            <source src={fileUrl} type={fileAttachment.mimeType} />
            Your browser does not support the audio element.
          </audio>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">{formatFileSize(fileAttachment.size)}</div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )

    case "video":
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <FileVideo className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm font-medium truncate text-gray-800">{fileAttachment.originalFilename}</span>
          </div>
          <video controls className="w-full max-h-[300px]">
            <source src={fileUrl} type={fileAttachment.mimeType} />
            Your browser does not support the video element.
          </video>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">{formatFileSize(fileAttachment.size)}</div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )

    case "document":
      // For PDFs, we can embed them
      if (fileAttachment.mimeType === "application/pdf") {
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              <span className="text-sm font-medium truncate text-gray-800">{fileAttachment.originalFilename}</span>
            </div>
            <div className="relative" style={{ paddingTop: "75%" }}>
              <iframe
                src={`${fileUrl}#view=FitH`}
                className="absolute top-0 left-0 w-full h-full border-0 rounded"
                title={fileAttachment.originalFilename}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-gray-500">{formatFileSize(fileAttachment.size)}</div>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )
      }
      // For other document types, show a download link
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm font-medium truncate text-gray-800">{fileAttachment.originalFilename}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">{formatFileSize(fileAttachment.size)}</div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </div>
      )

    case "image":
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <FileText className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm font-medium truncate text-gray-800">{fileAttachment.originalFilename}</span>
          </div>
          <img
            src={fileUrl || "/placeholder.svg"}
            alt={fileAttachment.originalFilename}
            className="max-w-full rounded-md"
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">{formatFileSize(fileAttachment.size)}</div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )

    default:
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <File className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm font-medium truncate text-gray-800">{fileAttachment.originalFilename}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">{formatFileSize(fileAttachment.size)}</div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )
  }
}
