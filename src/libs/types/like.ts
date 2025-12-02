import { ObjectId, Types } from "mongoose";
import { LikeGroup } from "../enums/like.enum";

export interface Like {
    _id: Types.ObjectId;
    likeGroup: LikeGroup;
    likeRefId: Types.ObjectId;
    memberId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface LikeInput {
    likeGroup: LikeGroup;
    likeRefId: Types.ObjectId;
    memberId?: Types.ObjectId;
}
