import express from "express";
import memberController from "./controllers/member.controller";
import eventController from "./controllers/event.controller";
import applicationController from "./controllers/application.controller";
import boardController from "./controllers/board.controller";
import commentController from "./controllers/comment.controller";
import likeController from "./controllers/like.controller";
import makeUploader from "./libs/utils/uploader";

const router = express.Router();

/** MEMBER ROUTES */
router.post("/member/signup", memberController.signup);
router.post("/member/login", memberController.login);
router.get("/member/check-auth", memberController.checkAuth);

/** EVENT ROUTES */
router.post(
  "/event/create",
  memberController.verifyAuth,
  makeUploader("events").single("eventImage"),
  eventController.createEvent
);
router.get("/event/all", eventController.getEvents);
// New Detail Route with View Counting
router.get(
  "/event/detail/:id",
  memberController.retrieveAuth,
  eventController.getEvent
);

/** APPLICATION ROUTES */
router.post(
  "/application/join",
  memberController.verifyAuth,
  applicationController.joinEvent
);
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
// New Detail Route with View Counting
router.get(
  "/board/detail/:id",
  memberController.retrieveAuth,
  boardController.getBoard
);

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
