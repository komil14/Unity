import mongoose, { Schema } from 'mongoose';
import { BoardStatus } from '../libs/enums/board.enum';

const boardSchema = new Schema({
    boardStatus: {
        type: String,
        enum: BoardStatus,
        default: BoardStatus.ACTIVE
    },

    boardTitle: {
        type: String,
        required: true
    },

    boardContent: {
        type: String,
        required: true
    },

    boardImage: {
        type: String,
        required: false,
        default: ""
    },

    // RELATION: Who wrote this?
    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Member'
    },

    // DENORMALIZED FIELDS (Polymorphic Support)
    boardLikes: {
        type: Number,
        default: 0
    },

    boardViews: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true, 
});

export default mongoose.model('Board', boardSchema);