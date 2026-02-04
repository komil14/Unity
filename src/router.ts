import express from "express";
import memberController from "./controllers/member.controller";
import eventController from "./controllers/event.controller";
import applicationController from "./controllers/application.controller";
import boardController from "./controllers/board.controller";
import commentController from "./controllers/comment.controller";
import likeController from "./controllers/like.controller";
import groupController from "./controllers/group.controller";
import makeUploader from "./libs/utils/uploader";

const router = express.Router();

/** MEMBER ROUTES */
router.post("/member/signup", memberController.signup);
router.post("/member/login", memberController.login);
router.get("/member/check-auth", memberController.checkAuth);
router.post("/member/logout", memberController.logout);
router.post(
  "/member/profile",
  memberController.verifyAuth,
  makeUploader("members").single("memberImage"),
  memberController.updateProfile,
);
router.post(
  "/member/profile",
  memberController.verifyAuth,
  makeUploader("members").single("memberImage"),
  memberController.updateProfile,
);

/** ORGANIZER ROUTES */
router.get("/organizer/all", memberController.getOrganizers);
router.get("/organizer/top", memberController.getTopOrganizers);
router.post(
  "/organizer/view/:id",
  memberController.retrieveAuth,
  memberController.viewOrganizer,
);
router.get(
  "/organizer/detail/:id",
  memberController.retrieveAuth,
  memberController.getOrganizer,
);

/** EVENT ROUTES */
router.post(
  "/event/create",
  memberController.verifyAuth,
  makeUploader("events").array("eventImages", 5),
  eventController.createEvent,
);
router.post(
  "/event/update/:id",
  memberController.verifyAuth,
  makeUploader("events").array("eventImages", 5),
  eventController.updateEvent,
);
router.get("/event/all", eventController.getEvents);
router.get("/event/popular-weekly", eventController.getWeeklyPopularEvents);
// New Detail Route with View Counting
router.get(
  "/event/detail/:id",
  memberController.retrieveAuth,
  eventController.getEvent,
);

// Change Event Status (ACTIVE -> CANCELED, etc.)
router.patch(
  "/event/status/:id",
  memberController.verifyAuth,
  eventController.changeEventStatus,
);

// Delete Event
router.delete(
  "/event/delete/:id",
  memberController.verifyAuth,
  eventController.deleteEvent,
);

/** GROUP ROUTES */
router.post(
  "/group/create",
  memberController.verifyAuth,
  makeUploader("groups").single("groupImage"),
  groupController.createGroup,
);
router.post(
  "/group/update",
  memberController.verifyAuth,
  makeUploader("groups").single("groupImage"),
  groupController.updateGroup,
);
router.get("/group/all", groupController.getGroups);
router.get(
  "/group/detail/:id",
  memberController.retrieveAuth,
  groupController.getGroup,
);
router.post(
  "/group/join",
  memberController.verifyAuth,
  groupController.joinGroup,
);
router.get(
  "/group/my",
  memberController.verifyAuth,
  groupController.getMyGroups,
);

/** APPLICATION ROUTES */
router.post(
  "/application/join",
  memberController.verifyAuth,
  applicationController.joinEvent,
);
router.get(
  "/application/my",
  memberController.verifyAuth,
  applicationController.getMyApplications,
);
router.get(
  "/application/check/:eventId",
  memberController.verifyAuth,
  applicationController.getApplicationStatus,
);
router.post(
  "/application/cancel/:eventId",
  memberController.verifyAuth,
  applicationController.cancelApplication,
);
router.get(
  "/event/:id/attendees",
  memberController.retrieveAuth,
  applicationController.getEventAttendees,
);

/** BOARD ROUTES */
router.post(
  "/board/create",
  memberController.verifyAuth,
  makeUploader("community").single("boardImage"),
  boardController.createBoard,
);
router.get("/board/all", boardController.getBoards);
// New Detail Route with View Counting
router.get(
  "/board/detail/:id",
  memberController.retrieveAuth,
  boardController.getBoard,
);

/** COMMENT ROUTES */
router.post(
  "/comment/create",
  memberController.verifyAuth,
  commentController.createComment,
);
router.get("/comment/all", commentController.getComments);
router.patch(
  "/comment/:id",
  memberController.verifyAuth,
  commentController.updateComment,
);
router.delete(
  "/comment/:id",
  memberController.verifyAuth,
  commentController.deleteComment,
);

/** LIKE ROUTES */
router.post(
  "/like/toggle",
  memberController.verifyAuth,
  likeController.toggleLike,
);

router.post(
  "/like/exists-batch",
  memberController.retrieveAuth,
  likeController.checkLikesBatch,
);

export default router;
