"use server"

import { connectToDatabase } from "@/lib/mongodb"
import { uploadFileToS3, generateUniqueFilename, getFileTypeCategory } from "@/lib/s3-utils"

export async function uploadFile(formData: FormData) {
  try {
    await connectToDatabase()

    const file = formData.get("file") as File
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Check file size (limit to 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File size exceeds 50MB limit" }
    }

    // Get file details
    const mimeType = file.type
    const originalFilename = file.name
    const fileSize = file.size

    // Generate a unique filename
    const uniqueFilename = generateUniqueFilename(originalFilename, mimeType)

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const uploadResult = await uploadFileToS3(fileBuffer, uniqueFilename, mimeType)

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || "Failed to upload file" }
    }

    // Determine file type category
    const fileType = getFileTypeCategory(mimeType)

    // Return file details
    return {
      success: true,
      file: {
        filename: uniqueFilename,
        originalFilename,
        mimeType,
        size: fileSize,
        s3Key: uploadResult.key,
        fileType,
      },
    }
  } catch (error) {
    console.error("Error uploading file:", error)
    return { success: false, error: "Failed to upload file" }
  }
}

export async function getFileUrl(s3Key: string) {
  try {
    await connectToDatabase()

    // Import dynamically to avoid server-side bundling issues
    const { getFileSignedUrl } = await import("@/lib/s3-utils")

    const url = await getFileSignedUrl(s3Key)
    return { success: true, url }
  } catch (error) {
    console.error("Error getting file URL:", error)
    return { success: false, error: "Failed to get file URL" }
  }
}
