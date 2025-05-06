import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || ""

// Get file extension from mime type
export function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
  }

  return mimeToExt[mimeType] || "bin"
}

// Generate a unique filename for S3
export function generateUniqueFilename(originalFilename: string, mimeType: string): string {
  const fileExt = getFileExtension(mimeType)
  const uniqueId = uuidv4()
  return `${uniqueId}.${fileExt}`
}

// Upload file to S3
export async function uploadFileToS3(
  file: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    if (!BUCKET_NAME) {
      return { success: false, error: "S3 bucket name is not configured" }
    }

    const key = `uploads/${filename}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
    })

    await s3Client.send(command)
    return { success: true, key }
  } catch (error) {
    console.error("Error uploading file to S3:", error)
    return { success: false, error: "Failed to upload file" }
  }
}

// Generate a pre-signed URL for file download
export async function getFileSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    if (!BUCKET_NAME) {
      throw new Error("S3 bucket name is not configured")
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    return await getSignedUrl(s3Client, command, { expiresIn })
  } catch (error) {
    console.error("Error generating signed URL:", error)
    throw new Error("Failed to generate file URL")
  }
}

// Get file type category based on mime type
export function getFileTypeCategory(mimeType: string): "audio" | "video" | "document" | "image" | "other" {
  if (mimeType.startsWith("audio/")) {
    return "audio"
  } else if (mimeType.startsWith("video/")) {
    return "video"
  } else if (
    mimeType.startsWith("application/pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("text/")
  ) {
    return "document"
  } else if (mimeType.startsWith("image/")) {
    return "image"
  } else {
    return "other"
  }
}
