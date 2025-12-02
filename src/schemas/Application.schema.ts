import mongoose, { Schema } from 'mongoose';
import { ApplicationStatus } from '../libs/enums/application.enum';

const applicationSchema = new Schema({
    applicationStatus: {
        type: String,
        enum: ApplicationStatus,
        default: ApplicationStatus.PENDING
    },

    // RELATION 1: Which Event?
    eventId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Event'
    },

    // RELATION 2: Which Volunteer?
    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Member'
    },

    // OPTIONAL: Why do you want to join?
    applicationNote: {
        type: String,
        required: false,
        default: ""
    }

}, { 
    timestamps: true,   // Important to know WHEN they applied (First come, first served)
});

// INDEXING: Critical for performance
// A user should not be able to apply to the SAME event twice.
applicationSchema.index({ eventId: 1, memberId: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);