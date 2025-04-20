import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      lastUpdated: {
        type: Date,
        default: null,
      },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

// Add geospatial index for location-based queries
UserSchema.index({ location: "2dsphere" })

export const User = mongoose.models.User || mongoose.model("User", UserSchema)
