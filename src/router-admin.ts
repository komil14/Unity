import express from "express";
import adminController from "./controllers/admin.controller";

const routerAdmin = express.Router();

// Dashboard & Auth
routerAdmin.get("/", adminController.goHome);
routerAdmin.get("/login", adminController.getLogin);
routerAdmin.post("/login", adminController.processLogin);
if (process.env.NODE_ENV !== "production") {
  routerAdmin.get("/signup", adminController.getSignup);
  routerAdmin.post("/signup", adminController.processSignup);
}
routerAdmin.get("/logout", adminController.logout);
routerAdmin.post("/logout", adminController.logout);
routerAdmin.get("/check-me", adminController.checkAuthSession);

// Users
routerAdmin.get(
  "/users",
  adminController.verifyAdmin,
  adminController.getUsers,
);
routerAdmin.post(
  "/user/edit",
  adminController.verifyAdmin,
  adminController.updateMember,
);

// Events
routerAdmin.get(
  "/events",
  adminController.verifyAdmin,
  adminController.getAllEvents,
);
routerAdmin.post(
  "/event/edit",
  adminController.verifyAdmin,
  adminController.updateEvent,
);

// Boards
routerAdmin.get(
  "/boards",
  adminController.verifyAdmin,
  adminController.getAllBoards,
);
routerAdmin.post(
  "/board/edit",
  adminController.verifyAdmin,
  adminController.updateBoard,
);

// Comments
routerAdmin.get(
  "/comments",
  adminController.verifyAdmin,
  adminController.getAllComments,
);
routerAdmin.post(
  "/comment/edit",
  adminController.verifyAdmin,
  adminController.updateComment,
);

export default routerAdmin;
