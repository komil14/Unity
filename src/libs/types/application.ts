import { Types } from "mongoose";
import { ApplicationStatus } from "../enums/application.enum";

// 1. DB Document Interface
export interface Application {
    _id: Types.ObjectId;  // <--- Changed from ObjectId to Types.ObjectId
    applicationStatus: ApplicationStatus;
    eventId: Types.ObjectId;
    memberId: Types.ObjectId;
    applicationNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Input DTO
export interface ApplicationInput {
    eventId: Types.ObjectId;
    memberId?: Types.ObjectId; // <--- This fixes your error
    applicationNote?: string;
}