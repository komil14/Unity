import express from "express";
import memberController from "./controllers/member.controller";
import eventController from "./controllers/event.controller";
import applicationController from "./controllers/application.controller"; // Import
import makeUploader from "./libs/utils/uploader";
import boardController from "./controllers/board.controller";
import commentController from "./controllers/comment.controller";
import likeController from "./controllers/like.controller";

const router = express.Router();

/** MEMBER ROUTES */
router.post("/member/signup", memberController.signup);
router.post("/member/login", memberController.login);

/** EVENT ROUTES */
router.post(
    "/event/create", 
    memberController.verifyAuth, 
    makeUploader("events").single("eventImage"), 
    eventController.createEvent
);
router.get("/event/all", eventController.getEvents);

/** APPLICATION ROUTES (New) */
// 1. User Joins Event
router.post(
    "/application/join", 
    memberController.verifyAuth, 
    applicationController.joinEvent
);

// 2. User Views My Applications
router.get(
    "/application/my", 
    memberController.verifyAuth, 
    applicationController.getMyApplications
);

/** BOARD ROUTES */
router.post(
    "/board/create",
    memberController.verifyAuth,
    makeUploader("community").single("boardImage"),
    boardController.createBoard
);

router.get("/board/all", boardController.getBoards);

/** COMMENT ROUTES */
router.post(
    "/comment/create",
    memberController.verifyAuth,
    commentController.createComment
);

router.get("/comment/all", commentController.getComments);

/** LIKE ROUTES */
router.post(
    "/like/toggle",
    memberController.verifyAuth,
    likeController.toggleLike
);

export default router;