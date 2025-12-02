import { ObjectId } from "mongoose";
import { ApplicationStatus } from "../enums/application.enum";

// 1. DB Document Interface
export interface Application {
    _id: ObjectId;
    applicationStatus: ApplicationStatus;
    eventId: ObjectId;
    memberId: ObjectId; // Volunteer
    applicationNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Input DTO
export interface ApplicationInput {
    eventId: ObjectId;
    memberId?: ObjectId;
    applicationNote?: string;
}