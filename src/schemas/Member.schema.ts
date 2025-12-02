import mongoose, { Schema } from "mongoose";
import { MemberStatus } from "../libs/enums/member.enum";
import { MemberType } from "../libs/enums/member.enum";
const memberSchema = new Schema({
    memberType: {
        type: String,
        enum: MemberType,
        default: MemberType.USER
    },

    memberStatus: {
        type: String,
        enum: MemberStatus,
        default: MemberStatus.ACTIVE
    },

    memberNick: {
        type: String,
        required: true,
        unique: true,     // Username/Org Name must be unique
        index: true
    },

    memberPhone: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    memberPassword: {
        type: String,
        required: true,
        select: false     // Security: Never return password by default
    },

    memberAddress: {
        type: String,
        required: false
    },

    memberDesc: {
        type: String,
        required: false   // Bio for Users, "About Us" for Orgs
    },

    memberImage: {
        type: String,
        default: "" 
    },

    memberPoints: {
        type: Number,
        default: 0
    },

    // DENORMALIZED FIELDS (For Performance)
    memberLikes: {
        type: Number,
        default: 0
    },

    memberViews: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true,   // Adds createdAt, updatedAt automatically
});

export default mongoose.model('Member', memberSchema);