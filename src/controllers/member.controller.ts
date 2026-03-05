import { Request, Response } from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import AuthService from "../models/Auth.service";
import { MemberInput, LoginInput, AdminRequest } from "../libs/types/member";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import adminController from "./admin.controller";

// Instantiate Services
const memberService = new MemberService();
const authService = new AuthService();

const memberController: T = {};

/** SPA: Signup */
memberController.signup = async (req: Request, res: Response) => {
  try {
    console.log("Signup request received");
    const input: MemberInput = req.body;

    const result = await memberService.signup(input);

    // Generate Token
    const token = await authService.createToken(result);

    // Set Cookie
    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(201).json({ member: result, accessToken: token });
  } catch (err) {
    console.log("Error: signup", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** SPA: Login */
memberController.login = async (req: Request, res: Response) => {
  try {
    console.log("Login request received");
    const input: LoginInput = req.body;

    const result = await memberService.login(input);

    // Generate Token
    const token = await authService.createToken(result);

    // Set Cookie
    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({ member: result, accessToken: token });
  } catch (err: any) {
    console.log("Error, login:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** SPA: Logout */
memberController.logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("accessToken");
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.log("Error, logout:", err);
    res.status(200).json({ ok: true });
  }
};

/** * MIDDLEWARE: Verify Auth (Strict)
 * Throws error if not logged in. Used for Creating/Updating content.
 */
memberController.verifyAuth = async (
  req: AdminRequest,
  res: Response,
  next: Function,
) => {
  try {
    const token = req.cookies["accessToken"];
    if (!token)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    const member = await authService.checkAuth(token);
    if (!member)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    req.member = member;
    next();
  } catch (err: any) {
    console.log("Error, verifyAuth:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else
      res
        .status(HttpCode.UNAUTHORIZED)
        .json({ message: Message.NOT_AUTHENTICATED });
  }
};

/** * MIDDLEWARE: Retrieve Auth (Soft)
 * Does NOT throw error if not logged in. Used for View Counting / "Liked" status checks.
 */
memberController.retrieveAuth = async (
  req: AdminRequest,
  res: Response,
  next: Function,
) => {
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

memberController.checkAuth = async (req: AdminRequest, res: Response) => {
  try {
    const token = req.cookies["accessToken"];
    if (!token) {
      return res.status(200).json({ member: null });
    }

    const member = await authService.checkAuth(token);
    if (!member) {
      return res.status(200).json({ member: null });
    }

    res.status(200).json({ member: member });
  } catch (err: any) {
    console.log("Error, checkAuth:", err);
    // Treat failures as unauthenticated rather than an error state.
    return res.status(200).json({ member: null });
  }
};

memberController.updateProfile = async (req: AdminRequest, res: Response) => {
  try {
    console.log("UpdateProfile Body:", req.body);
    if (!req.member) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }

    console.log("UpdateProfile - req.member._id:", req.member._id);
    const payload: any = { ...req.body };
    if (req.file) {
      payload.memberImage = (req.file as any).filename;
    }

    console.log("UpdateProfile Payload:", payload);
    const updated = await memberService.updateProfile(req.member._id, payload);
    console.log("UpdateProfile Result:", updated);

    // Generate new token with updated member data
    const newToken = await authService.createToken(updated);
    console.log("UpdateProfile - New token created");

    // Set the new token in cookie
    res.cookie("accessToken", newToken, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json(updated);
  } catch (err: any) {
    console.log("Error, updateProfile:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.UPDATE_FAILED });
  }
};

/** GET: Organizers (ORG accounts) */
memberController.getOrganizers = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const order = req.query.order ? String(req.query.order) : "createdAt";
    const search = req.query.search ? String(req.query.search) : undefined;
    const directionRaw = req.query.direction
      ? String(req.query.direction)
      : undefined;
    const direction =
      directionRaw === "asc" || directionRaw === "desc"
        ? directionRaw
        : undefined;

    const result = await memberService.getOrganizers({
      page,
      limit,
      order,
      direction,
      search,
      onlyActive: true,
    });

    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getOrganizers:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: Organizer detail (+ organized events/groups) */
memberController.getOrganizer = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const viewerId = req.member?._id ?? null;
    const result = await memberService.getOrganizerDetail(viewerId, id);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getOrganizer:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** POST: Organizer view (+1 memberViews) */
memberController.viewOrganizer = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const viewerId = req.member?._id ?? null;
    const memberViews = await memberService.viewOrganizer(viewerId, id);
    res.status(200).json({ memberViews });
  } catch (err: any) {
    console.log("Error, viewOrganizer:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: Top Organizers (ranked) */
memberController.getTopOrganizers = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 4;
    const result = await memberService.getTopOrganizers(limit);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getTopOrganizers:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default memberController;
