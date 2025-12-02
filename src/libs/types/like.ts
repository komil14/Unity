import { ObjectId } from "mongoose";
import { LikeGroup } from "../enums/like.enum";

export interface Like {
    _id: ObjectId;
    likeGroup: LikeGroup;
    likeRefId: ObjectId;
    memberId: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface LikeInput {
    likeGroup: LikeGroup;
    likeRefId: ObjectId;
    memberId?: ObjectId;
}
