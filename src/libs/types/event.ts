import { ObjectId } from "mongoose";
import { EventStatus } from "../enums/event.enum";

// 1. DB Document Interface
export interface Event {
    _id: ObjectId;
    eventStatus: EventStatus;
    eventTitle: string;
    eventDesc: string;
    eventLocation: string;
    eventDate: Date;
    eventCapacity: number;
    eventJoined: number;
    eventImages: string[];
    eventPoints: number;
    memberId: ObjectId; // Creator (Organization)
    eventLikes: number;
    eventViews: number;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Input DTO
export interface EventInput {
    eventTitle: string;
    eventDesc: string;
    eventLocation: string;
    eventDate: string; // Passed as string from JSON, converted to Date in logic
    eventCapacity: number;
    eventImages?: string[];
    memberId?: ObjectId; // Usually injected by the server from the token
}