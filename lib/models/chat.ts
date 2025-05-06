import mongoose from "mongoose"

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    fileAttachment: {
      type: {
        filename: String,
        originalFilename: String,
        mimeType: String,
        size: Number,
        s3Key: String,
        fileType: {
          type: String,
          enum: ["audio", "video", "document", "image", "other"],
        },
      },
      default: null,
    },
  },
  { timestamps: true },
)

const ChatSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    photo: {
      type: String,
      default: null,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    messages: [MessageSchema],
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
  },
  { timestamps: true },
)

// Add geospatial index for location-based queries
ChatSchema.index({ location: "2dsphere" })

// Make sure we're using the right model
export const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema)
