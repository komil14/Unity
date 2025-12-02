import express from "express";
import adminController from "./controllers/admin.controller";

const routerAdmin = express.Router();

// Dashboard
routerAdmin.get("/", adminController.goHome);

// Authentication
routerAdmin.get("/login", adminController.getLogin);
routerAdmin.post("/login", adminController.processLogin); // Now connects to session logic

routerAdmin.get("/signup", adminController.getSignup);
routerAdmin.post("/signup", adminController.processSignup);

routerAdmin.get("/check-me", adminController.checkAuthSession);

/** User Management */
routerAdmin.get(
  "/users",
  adminController.verifyAdmin,
  adminController.getUsers
);
routerAdmin.post(
  "/user/edit",
  adminController.verifyAdmin,
  adminController.updateMember
);

routerAdmin.get("/logout", adminController.logout);
export default routerAdmin;
