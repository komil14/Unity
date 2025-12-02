import mongoose, { Schema } from 'mongoose';
import { LikeGroup } from '../libs/enums/like.enum';

const likeSchema = new Schema({
    likeGroup: {
        type: String,
        enum: LikeGroup,
        required: true
    },

    likeRefId: {
        type: Schema.Types.ObjectId,
        required: true
        // Note: We cannot use 'ref' here because it changes dynamically 
        // (sometimes refers to Event, sometimes Article, etc.)
    },

    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Member'
    }

}, { 
    timestamps: true, 
    collection: 'likes' 
});

// CRITICAL: Prevent Duplicate Likes
// A user can like different things, but cannot like the SAME thing twice.
likeSchema.index({ memberId: 1, likeRefId: 1, likeGroup: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);