import { Types } from "mongoose";
import { GroupStatus } from "../enums/group.enum";

export interface Group {
  _id: Types.ObjectId;
  groupStatus: GroupStatus;
  groupName: string;
  groupDesc: string;
  groupImage: string;
  groupCategories: string[];
  memberId: Types.ObjectId; // creator (ORG)
  memberCount: number;
  groupLikes: number;
  groupViews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupInput {
  [x: string]: unknown;
  groupName: string;
  groupDesc: string;
  groupImage?: string;
  groupCategories?: string[] | string;
  memberId?: Types.ObjectId;
}

export interface GroupUpdateInput {
  [x: string]: unknown;
  _id: string;
  groupName?: string;
  groupDesc?: string;
  groupImage?: string;
  groupCategories?: string[] | string;
}

export interface GroupInquiry {
  page: number;
  limit: number;
  order?: string;
  search?: string;
  memberId?: Types.ObjectId;
}
