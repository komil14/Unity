import { ObjectId, Types } from "mongoose";
import { MemberStatus, MemberType } from "../enums/member.enum";
import { Request } from "express";
import { Session } from "express-session";

// 1. DB Document Interface
export interface Member {
    _id: Types.ObjectId;
    memberType: MemberType;
    memberStatus: MemberStatus;
    memberNick: string;
    memberPhone: string;
    memberPassword?: string; // Optional because we often delete it
    memberAddress?: string;
    memberDesc?: string;
    memberImage?: string;
    memberPoints: number;
    memberLikes: number;
    memberViews: number;
    createdAt: Date;
    updatedAt: Date;
}

// 2. Input DTOs
export interface MemberInput {
    memberType: MemberType;
    memberStatus?: MemberStatus;
    memberNick: string;
    memberPhone: string;
    memberPassword: string;
    memberAddress?: string;
    memberDesc?: string;
    memberImage?: string;
}

export interface LoginInput {
    memberNick: string;
    memberPassword: string;
}

export interface AdminRequest extends Request {
  [x: string]: any;
  req: any;
  member: Member;
  session: Session & { member: Member };
  file: Express.Multer.File;
  files: Express.Multer.File[];
}
export interface ExtendedRequest extends Request {
  member: Member;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}