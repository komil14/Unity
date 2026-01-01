import mongoose, { Schema } from "mongoose";
import { GroupStatus } from "../libs/enums/group.enum";

const groupSchema = new Schema(
  {
    groupStatus: {
      type: String,
      enum: GroupStatus,
      default: GroupStatus.ACTIVE,
    },

    groupName: {
      type: String,
      required: true,
      index: true,
    },

    groupDesc: {
      type: String,
      required: true,
    },

    groupImage: {
      type: String,
      default: "",
    },

    groupCategories: {
      type: [String],
      default: [],
    },

    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
      index: true,
    },

    memberCount: {
      type: Number,
      default: 1,
    },

    groupLikes: {
      type: Number,
      default: 0,
    },

    groupViews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate group names per creator (basic guard)
groupSchema.index({ memberId: 1, groupName: 1 }, { unique: true });

export default mongoose.model("Group", groupSchema);
