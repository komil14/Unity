import { ObjectId } from "mongoose";
import { BoardStatus } from "../enums/board.enum";

// 1. DB Document Interface
export interface Board {
    _id: ObjectId;
    boardStatus: BoardStatus;
    boardTitle: string;
    boardContent: string;
    boardImage?: string;
    memberId: ObjectId; // Author
    boardLikes: number;
    boardViews: number;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Input DTO
export interface BoardInput {
    boardTitle: string;
    boardContent: string;
    boardImage?: string;
    memberId?: ObjectId;
}