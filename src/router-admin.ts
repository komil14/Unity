import express from "express";
import adminController from "./controllers/admin.controller";

const routerAdmin = express.Router();

routerAdmin.get("/", adminController.goHome);
routerAdmin.get("/signup", adminController.getSignup);
routerAdmin.post("/signup", adminController.processSignup);

routerAdmin.get("/login", adminController.getLogin);
routerAdmin.post("/login", adminController.processLogin);

export default routerAdmin;
