export enum MemberType {
    USER = "USER",         // Volunteer (SPA)
    ORG = "ORG",           // Organization (SPA)
    ADMIN = "ADMIN"        // Super Admin (BSSR)
}

export enum MemberStatus {
    ACTIVE = "ACTIVE",
    BLOCK = "BLOCK",
    DELETE = "DELETE",
    PENDING = "PENDING"    // Specific for Organizations waiting for approval
}