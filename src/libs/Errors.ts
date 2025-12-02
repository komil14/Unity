export enum HttpCode {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,         // <--- This was missing
    INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
    SOMETHING_WENT_WRONG = "Something went wrong!",
    NO_DATA_FOUND = "No data found!",
    CREATE_FAILED = "Create failed!",
    USED_NICK_PHONE = "I am sorry, Nickname or Phone is already used!", // <--- Missing
    WRONG_PASSWORD = "Wrong password, please try again!",               // <--- Missing
    BLOCKED_USER = "You have been blocked by admin!",                   // <--- Missing
    NOT_ALLOWED = "You are not allowed to access this resource!",        // <--- Missing
    ADMIN_EXISTS = "ADMIN_EXISTS"
}

class Errors extends Error {
    public code: HttpCode;
    public message: Message;

    constructor(code: HttpCode, message: Message) {
        super();
        this.code = code;
        this.message = message;
    }
}

export default Errors;