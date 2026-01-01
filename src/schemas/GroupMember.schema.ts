import mongoose, { Schema } from "mongoose";
import { GroupMemberRole } from "../libs/enums/group.enum";

const groupMemberSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Group",
      index: true,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
      index: true,
    },

    groupMemberRole: {
      type: String,
      enum: GroupMemberRole,
      default: GroupMemberRole.MEMBER,
    },

    joinDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: "groupMembers" }
);

// A member can join a group only once.
groupMemberSchema.index({ groupId: 1, memberId: 1 }, { unique: true });

export default mongoose.model("GroupMember", groupMemberSchema);
