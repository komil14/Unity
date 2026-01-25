import { Types } from "mongoose";
import { CommentStatus } from "../enums/comment.enum";
import { Member } from "./member";

// 1. DB Document Interface
export interface Comment {
  _id: Types.ObjectId;
  commentStatus: CommentStatus;
  commentContent: string;
  articleId: Types.ObjectId;
  memberId: Types.ObjectId;
  commentLikes: number;
  createdAt: Date;
  updatedAt: Date;
  /** Virtual Field: Aggregated Member Data */
  memberData?: Member;
}

// 2. Input DTO
export interface CommentInput {
  commentContent: string;
  articleId: Types.ObjectId;
  memberId?: Types.ObjectId;
}

// 3. Search/Filter DTO
export interface CommentInquiry {
  page: number;
  limit: number;
  articleId: Types.ObjectId;
  targetType?: "article" | "event"; // Support both article and event comments
}
