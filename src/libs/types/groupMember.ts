import { Types } from "mongoose";
import { GroupMemberRole } from "../enums/group.enum";

export interface GroupMember {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  memberId: Types.ObjectId;
  groupMemberRole: GroupMemberRole;
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinGroupInput {
  groupId: string;
  groupMemberRole?: GroupMemberRole;
}
