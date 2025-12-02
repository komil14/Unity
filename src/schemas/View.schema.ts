import mongoose, { Schema } from 'mongoose';
import { ViewGroup } from '../libs/enums/view.enum';

const viewSchema = new Schema({
    viewGroup: {
        type: String,
        enum: ViewGroup,
        required: true
    },

    viewRefId: {
        type: Schema.Types.ObjectId,
        required: true
    },

    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Member'
    }

}, { 
    timestamps: true, 
    collection: 'views' 
});

// OPTIONAL: Prevent View Spam
// If you want 1 User = 1 View (Unique), keep this index.
// If you want every refresh to count as a view, remove { unique: true }.
viewSchema.index({ memberId: 1, viewRefId: 1, viewGroup: 1 }, { unique: true });

export default mongoose.model('View', viewSchema);