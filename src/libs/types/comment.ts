import { ObjectId } from "mongoose";
import { CommentStatus } from "../enums/comment.enum";

// 1. DB Document Interface
export interface Comment {
    _id: ObjectId;
    commentStatus: CommentStatus;
    commentContent: string;
    articleId: ObjectId;
    memberId: ObjectId;
    commentLikes: number;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Input DTO
export interface CommentInput {
    commentContent: string;
    articleId: ObjectId;
    memberId?: ObjectId;
}