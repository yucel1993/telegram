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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      // Create form data
      const formData = new FormData()
      formData.append("file", selectedFile)

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
        // Clear the selected file immediately after successful upload
        setSelectedFile(null)
        setUploadProgress(0)
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

  // If a file is selected, show file details and upload button
  if (selectedFile) {
    return (
      <div className="p-3 bg-gray-50 rounded-md w-full">
        <div className="flex justify-between items-center mb-2">
          <div className="truncate max-w-[200px]">{selectedFile.name}</div>
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isUploading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button size="sm" onClick={handleUpload} className="w-full" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
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
