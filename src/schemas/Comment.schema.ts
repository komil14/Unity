import mongoose, { Schema } from 'mongoose';
import { CommentStatus } from '../libs/enums/comment.enum';

const commentSchema = new Schema({
    commentStatus: {
        type: String,
        enum: CommentStatus,
        default: CommentStatus.ACTIVE
    },

    commentContent: {
        type: String,
        required: true
    },

    // RELATION 1: Which Article are we talking about?
    articleId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Board'
    },

    // RELATION 2: Who wrote the comment?
    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Member'
    },

    // DENORMALIZED FIELDS
    // We store the number of likes on the comment itself for speed
    commentLikes: {
        type: Number,
        default: 0
    }

}, { 
    timestamps: true, 
});

export default mongoose.model('Comment', commentSchema);