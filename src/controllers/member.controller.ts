import { Request, Response } from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import AuthService from "../models/Auth.service";
import { MemberInput, LoginInput, AdminRequest } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";

import EventService from "../models/Event.service"; // Import Service
import adminController from "./admin.controller";

const eventService = new EventService();

// Instantiate Services
const memberService = new MemberService();
const authService = new AuthService();

const memberController: T = {};

/** SPA: Signup */
memberController.signup = async (req: Request, res: Response) => {
  try {
    console.log("Signup Body:", req.body);
    const input: MemberInput = req.body;

    // Validation: Only USER or ORG allowed via API
    if (input.memberType !== MemberType.USER && input.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    const result = await memberService.signup(input);
    
    // Generate Token
    const token = await authService.createToken(result);

    // Set Cookie
    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(201).json({ member: result, accessToken: token });
  } catch (err: any) {
    console.log("Error, signup:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** SPA: Login */
memberController.login = async (req: Request, res: Response) => {
  try {
    console.log("Login Body:", req.body);
    const input: LoginInput = req.body;

    const result = await memberService.login(input);
    
    // Generate Token
    const token = await authService.createToken(result);

    // Set Cookie
    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(200).json({ member: result, accessToken: token });
  } catch (err: any) {
    console.log("Error, login:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** * MIDDLEWARE: Verify Auth (Strict)
 * Throws error if not logged in. Used for Creating/Updating content.
 */
memberController.verifyAuth = async (req: AdminRequest, res: Response, next: Function) => {
  try {
    const token = req.cookies["accessToken"];
    if (!token) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    const member = await authService.checkAuth(token);
    if (!member) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    req.member = member;
    next();
  } catch (err: any) {
    console.log("Error, verifyAuth:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(HttpCode.UNAUTHORIZED).json({ message: Message.NOT_AUTHENTICATED });
  }
};

/** * MIDDLEWARE: Retrieve Auth (Soft)
 * Does NOT throw error if not logged in. Used for View Counting / "Liked" status checks.
 */
memberController.retrieveAuth = async (req: AdminRequest, res: Response, next: Function) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) {
        req.member = await authService.checkAuth(token);
    }
  } catch (err) {
    console.log("Error, retrieveAuth:", err);
  }
  next();
};

/** GET: Event Management Page */
adminController.getAllEvents = async (req: Request, res: Response) => {
  try {
    console.log("GetAllEvents");
    const events = await eventService.getAllEventsAdmin();
    res.render("events", { events: events });
  } catch (err) {
    console.log("Error: getAllEvents", err);
    res.redirect("/admin");
  }
};

/** POST: Update Event Status (Delete/Recover) */
adminController.updateEvent = async (req: Request, res: Response) => {
  try {
    console.log("UpdateEvent");
    const input: any = req.body; // Use 'any' or define exact type if preferred
    const result = await eventService.updateEventStatus(input);
    res.json({ state: "success", data: result });
  } catch (err) {
    console.log("Error: updateEvent", err);
    const message = err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.json({ state: "fail", message: message });
  }
};

export default memberController;