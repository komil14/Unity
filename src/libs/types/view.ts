import { ObjectId, Types } from "mongoose";
import { ViewGroup } from "../enums/view.enum";

export interface View {
    _id: Types.ObjectId;
    viewGroup: ViewGroup;
    viewRefId: Types.ObjectId;
    memberId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface ViewInput {
    viewGroup: ViewGroup;
    viewRefId: Types.ObjectId;
    memberId?: Types.ObjectId;
}