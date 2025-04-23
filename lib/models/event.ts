import mongoose from "mongoose"

const EventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // Store city in lowercase for easier searching
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    fee: {
      type: Number,
      default: null, // null means free
    },
    participantLimit: {
      type: Number,
      default: 0, // 0 means no limit
    },
    image: {
      type: String,
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    registeredUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
        email: String,
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
)

// Add index for city-based searches
EventSchema.index({ city: 1 })

export const Event = mongoose.models.Event || mongoose.model("Event", EventSchema)
