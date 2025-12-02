export enum ApplicationStatus {
    PENDING = "PENDING",       // User applied, waiting for Org
    APPROVED = "APPROVED",     // Org accepted the volunteer
    REJECTED = "REJECTED",     // Org said no
    COMPLETED = "COMPLETED",   // Event finished, points awarded
    CANCELED = "CANCELED"      // User changed their mind
}