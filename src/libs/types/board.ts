import { Types } from "mongoose"; // <--- Use 'Types'
import { BoardStatus } from "../enums/board.enum";

// 1. DB Document Interface
export interface Board {
    _id: Types.ObjectId;
    boardStatus: BoardStatus;
    boardTitle: string;
    boardContent: string;
    boardImage?: string;
    memberId: Types.ObjectId;
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
    memberId?: Types.ObjectId; // <--- Changed to Types.ObjectId
}

export interface BoardInquiry {
    page: number;
    limit: number;
    order?: string;
    search?: string;
    memberId?: Types.ObjectId;
}