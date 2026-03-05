import mongoose, { Schema } from "mongoose";
import { EventStatus } from "../libs/enums/event.enum";

const eventSchema = new Schema(
  {
    eventStatus: {
      type: String,
      enum: EventStatus,
      default: EventStatus.ACTIVE,
    },

    eventTitle: {
      type: String,
      required: true,
    },

    eventDesc: {
      type: String,
      required: true,
    },

    eventLocation: {
      type: String,
      required: true,
    },

    eventDate: {
      type: Date,
      required: true,
    },

    eventCapacity: {
      type: Number,
      required: true,
    },

    eventJoined: {
      type: Number,
      default: 0,
    },

    eventImages: {
      type: [String], // Array of strings for multiple photos
      default: [],
    },

    eventPoints: {
      // How many points a user earns for this event
      type: Number,
      default: 10,
    },

    // RELATIONS
    memberId: {
      // The Organization (Creator)
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },

    // DENORMALIZED FIELDS
    eventLikes: {
      type: Number,
      default: 0,
    },

    eventViews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);
eventSchema.index(
  { memberId: 1, eventTitle: 1, eventDate: 1 },
  { unique: true },
);
eventSchema.index({ eventStatus: 1, createdAt: -1 });
eventSchema.index({ eventDate: 1 });
export default mongoose.model("Event", eventSchema);
