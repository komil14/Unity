import { NextFunction, Request, Response } from "express";
import { T } from "../libs/types/common";
import { AdminRequest, LoginInput, MemberInput } from "../libs/types/member";
import { Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";
import MemberService from "../models/Member.service";
import EventService from "../models/Event.service";
import BoardService from "../models/Board.service";
import CommentService from "../models/Comment.service";

// Instantiate Services
const memberService = new MemberService();
const eventService = new EventService();
const boardService = new BoardService();
const commentService = new CommentService();

const adminController: T = {};

/** GET: Dashboard (Protected) */
adminController.goHome = async (req: AdminRequest, res: Response) => {
  try {
    if (!req.session?.member) {
      res.redirect("/admin/login");
    } else {
      const memberStats = await memberService.getMemberStats();
      const eventCount = await eventService.countEvents();
      const boardCount = await boardService.countBoards();

      res.render("home", { 
        user: req.session.member,
        stats: {
            members: memberStats,
            events: eventCount,
            boards: boardCount
        }
      });
    }
  } catch (err) {
    console.log("Error: goHome", err);
    res.redirect("/admin/login");
  }
};

/** AUTH PAGES */
adminController.getSignup = (req: Request, res: Response) => {
  try {
    res.render("signup");
  } catch (err) {
    console.log("Error: getSignup", err);
    res.redirect("/admin");
  }
};

adminController.getLogin = (req: Request, res: Response) => {
  try {
    res.render("login");
  } catch (err) {
    console.log("Error: getLogin", err);
    res.redirect("/admin");
  }
};

adminController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessSignup");
    const newAdmin: MemberInput = req.body;
    newAdmin.memberType = MemberType.ADMIN;

    const result = await memberService.processSignup(newAdmin);

    res.send(
      `<script> alert("Signup Successful! Please login."); window.location.replace('/admin/login')</script>`
    );
  } catch (err: any) {
    console.log("Error: processSignup", err);
    const message = err.message || Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/signup')</script>`
    );
  }
};

adminController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessLogin");
    const input: LoginInput = req.body;
    
    const result = await memberService.processLogin(input);

    req.session.member = result;
    req.session.save(function() {
        res.redirect("/admin");
    });

  } catch (err: any) {
    console.log("Error: processLogin", err);
    const message = err.message || Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/login')</script>`
    );
  }
};

adminController.logout = (req: Request, res: Response) => {
  try {
    req.session.destroy(function() {
        res.redirect("/admin/login");
    });
  } catch (err) {
    console.log("Error: logout", err);
    res.redirect("/admin");
  }
};

/** MANAGEMENT PAGES */

// 1. Users
adminController.getUsers = async (req: AdminRequest, res: Response) => {
  try {
    const users = await memberService.getUsers();
    // PASS USER HERE
    res.render("users", { users: users, user: req.session.member });
  } catch (err) {
    console.log("Error: getUsers", err);
    res.redirect("/admin");
  }
};

adminController.updateMember = async (req: Request, res: Response) => {
  try {
    const input: MemberInput = req.body;
    const result = await memberService.updateMember(input);
    res.json({ state: "success", data: result });
  } catch (err: any) {
    console.log("Error: updateMember", err);
    res.json({ state: "fail", message: err.message });
  }
};

// 2. Events
adminController.getAllEvents = async (req: AdminRequest, res: Response) => {
  try {
    const events = await eventService.getAllEventsAdmin();
    // PASS USER HERE (This fixes your error)
    res.render("events", { events: events, user: req.session.member });
  } catch (err) {
    console.log("Error: getAllEvents", err);
    res.redirect("/admin");
  }
};

adminController.updateEvent = async (req: Request, res: Response) => {
  try {
    const input: any = req.body;
    const result = await eventService.updateEventStatus(input);
    res.json({ state: "success", data: result });
  } catch (err: any) {
    console.log("Error: updateEvent", err);
    res.json({ state: "fail", message: err.message });
  }
};

// 3. Boards
adminController.getAllBoards = async (req: AdminRequest, res: Response) => {
  try {
    const boards = await boardService.getAllBoardsAdmin();
    // PASS USER HERE
    res.render("boards", { boards: boards, user: req.session.member });
  } catch (err) {
    console.log("Error: getAllBoards", err);
    res.redirect("/admin");
  }
};

adminController.updateBoard = async (req: AdminRequest, res: Response) => {
  try {
    const input: any = req.body;
    const result = await boardService.updateBoardStatus(input);
    res.json({ state: "success", data: result });
  } catch (err: any) {
    console.log("Error: updateBoard", err);
    res.json({ state: "fail", message: err.message });
  }
};

// 4. Comments
adminController.getAllComments = async (req: AdminRequest, res: Response) => {
  try {
    const comments = await commentService.getAllCommentsAdmin();
    // PASS USER HERE
    res.render("comments", { comments: comments, user: req.session.member });
  } catch (err) {
    console.log("Error: getAllComments", err);
    res.redirect("/admin");
  }
};

adminController.updateComment = async (req: Request, res: Response) => {
  try {
    const input: any = req.body;
    const result = await commentService.updateCommentStatus(input);
    res.json({ state: "success", data: result });
  } catch (err: any) {
    console.log("Error: updateComment", err);
    res.json({ state: "fail", message: err.message });
  }
};

/** UTILS */
adminController.checkAuthSession = (req: AdminRequest, res: Response) => {
  try {
    if (req.session?.member)
      res.send(`<script> alert("HI: ${req.session.member.memberNick}")</script>`);
    else
      res.send(`<script> alert("${Message.NOT_AUTHENTICATED}")</script>`);
  } catch (err) {
    console.log("Error: checkAuthSession", err);
    res.send(err);
  }
};

/** Middleware: Verify Admin */
adminController.verifyAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  if (req.session?.member?.memberType === MemberType.ADMIN) {
      req.member = req.session.member;
      next();
  } else {
      const message = Message.NOT_ALLOWED;
      res.send(
        `<script> alert("${message}"); window.location.replace('/admin/login')</script>`
      );
  }
};

export default adminController;