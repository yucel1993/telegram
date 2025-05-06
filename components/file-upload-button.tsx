"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, X, Loader2 } from "lucide-react"
import { uploadFile } from "@/app/actions/files"

interface FileUploadButtonProps {
  onFileUploaded: (fileData: any) => void
  onCancel: () => void
  isUploading: boolean
}

export default function FileUploadButton({ onFileUploaded, onCancel, isUploading }: FileUploadButtonProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Check file size - 8MB limit (slightly less than server limit)
      const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB
      if (file.size > MAX_FILE_SIZE) {
        alert("File is too large. Maximum size is 8MB.")
        // Reset the input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        return
      }

      setSelectedFile(file)

      // Auto-upload immediately after selection
      await handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    if (!file) return

    try {
      setUploading(true)

      // Create form data
      const formData = new FormData()
      formData.append("file", file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 10
          return newProgress > 90 ? 90 : newProgress
        })
      }, 300)

      // Upload file
      const result = await uploadFile(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success) {
        onFileUploaded(result.file)
        // Don't clear the selected file - keep it visible until sent
      } else {
        console.error("Upload failed:", result.error)
        // Reset
        setSelectedFile(null)
        setUploadProgress(0)
        onCancel()
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setSelectedFile(null)
      setUploadProgress(0)
      onCancel()
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    onCancel()
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // If a file is selected, show file details
  if (selectedFile) {
    return (
      <div className="p-3 bg-gray-50 rounded-md w-full">
        <div className="flex justify-between items-center mb-2">
          <div className="truncate max-w-[200px]">{selectedFile.name}</div>
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={uploading || isUploading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {(uploadProgress > 0 || uploading || isUploading) && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        {uploading || isUploading ? (
          <div className="text-xs text-center text-gray-500">
            <Loader2 className="h-4 w-4 mx-auto mb-1 animate-spin" />
            Uploading...
          </div>
        ) : uploadProgress === 100 ? (
          <div className="text-xs text-center text-green-600">Ready to send</div>
        ) : null}
      </div>
    )
  }

  // Default state - show upload button
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="audio/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/*"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={triggerFileInput}
        disabled={isUploading}
        className="w-full md:w-auto"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
    </>
  )
}
