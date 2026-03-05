import { NextFunction, Request, Response } from "express";
import { T } from "../libs/types/common";
import { AdminRequest, LoginInput, MemberInput } from "../libs/types/member";
import { Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";

// Correct Imports of all Services
import MemberService from "../models/Member.service";
import EventService from "../models/Event.service";
import BoardService from "../models/Board.service";
import CommentService from "../models/Comment.service";

// Correct Instantiations - Removing redundant explicit type annotation to rely on TypeScript inference and resolve the compiler bug (TS2339)
const memberService = new MemberService();
const eventService = new EventService();
const boardService = new BoardService(); // FIX: Removed ': BoardService'
const commentService = new CommentService(); // FIX: Removed ': CommentService'

const adminController: T = {};

/** GET: Dashboard */
adminController.goHome = async (req: AdminRequest, res: Response) => {
  try {
    if (!req.session?.member) {
      res.redirect("/admin/login");
    } else {
      // 1. Fetch Rich Stats
      const memberStats = await memberService.getMemberStats();
      const eventStats = await eventService.getEventStats(); // Updated method name
      const boardStats = await boardService.getBoardStats(); // Updated method name

      // 2. Aggregate Notifications
      // We group all "new" or "actionable" items here
      const notifications = {
        pendingOrgs: memberStats.pending,
        newUsers: memberStats.newUsers,
        newEvents: eventStats.newEvents,
        newBoards: boardStats.newBoards,
        total:
          memberStats.pending +
          memberStats.newUsers +
          eventStats.newEvents +
          boardStats.newBoards,
      };

      res.render("home", {
        user: req.session.member,
        stats: {
          members: memberStats,
          events: eventStats.total,
          boards: boardStats.total,
        },
        notifications: notifications, // Pass this new object to the view
      });
    }
  } catch (err) {
    console.log("Error: goHome", err);
    res.redirect("/admin/login");
  }
};

/** AUTH PAGES (Unchanged) */
adminController.getSignup = (req: Request, res: Response) => {
  try {
    res.render("signup");
  } catch (err) {
    res.redirect("/admin");
  }
};

adminController.getLogin = (req: Request, res: Response) => {
  try {
    res.render("login");
  } catch (err) {
    res.redirect("/admin");
  }
};

adminController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessSignup");
    const newAdmin: MemberInput = req.body;
    newAdmin.memberType = MemberType.ADMIN;
    await memberService.processSignup(newAdmin);
    res.send(
      `<script> alert("Signup Successful!"); window.location.replace('/admin/login')</script>`,
    );
  } catch (err: any) {
    const message = (err.message || Message.SOMETHING_WENT_WRONG).replace(
      /["'<>\\]/g,
      "",
    );
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/signup')</script>`,
    );
  }
};

adminController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessLogin");
    const input: LoginInput = req.body;

    const result = await memberService.processLogin(input);
    req.session.member = result;
    req.session.save(() => res.redirect("/admin"));
  } catch (err: any) {
    const message = (err.message || Message.SOMETHING_WENT_WRONG).replace(
      /["'<>\\]/g,
      "",
    );
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/login')</script>`,
    );
  }
};

adminController.logout = (req: Request, res: Response) => {
  try {
    req.session.destroy(() => res.redirect("/admin/login"));
  } catch (err) {
    res.redirect("/admin");
  }
};

/** MANAGEMENT PAGES (Users, Events, Boards, Comments) */

// 1. Users (MemberService)
adminController.getUsers = async (req: AdminRequest, res: Response) => {
  try {
    const users = await memberService.getUsers();
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

// 2. Events (EventService)
adminController.getAllEvents = async (req: AdminRequest, res: Response) => {
  try {
    const events = await eventService.getAllEventsAdmin();
    res.render("events", { events: events, user: req.session.member });
  } catch (err) {
    console.log("Error: getAllEvents", err);
    res.redirect("/admin");
  }
};

adminController.updateEvent = async (req: Request, res: Response) => {
  try {
    const input: any = req.body;
    const result = await eventService.updateEventStatus({
      _id: input._id,
      eventStatus: input.eventStatus,
    });
    res.json({ state: "success", data: result });
  } catch (err: any) {
    console.log("Error: updateEvent", err);
    res.json({ state: "fail", message: err.message });
  }
};

// 3. Boards (BoardService)
adminController.getAllBoards = async (req: AdminRequest, res: Response) => {
  try {
    // USAGE IS NOW VALIDATED
    const boards = await boardService.getAllBoardsAdmin();
    res.render("boards", { boards: boards, user: req.session.member });
  } catch (err) {
    console.log("Error: getAllBoards", err);
    res.redirect("/admin");
  }
};

adminController.updateBoard = async (req: Request, res: Response) => {
  try {
    const input: any = req.body;
    // USAGE IS NOW VALIDATED
    const result = await boardService.updateBoardStatus({
      _id: input._id,
      boardStatus: input.boardStatus,
    });
    res.json({ state: "success", data: result });
  } catch (err: any) {
    console.log("Error: updateBoard", err);
    res.json({ state: "fail", message: err.message });
  }
};

// 4. Comments (CommentService)
adminController.getAllComments = async (req: AdminRequest, res: Response) => {
  try {
    const comments = await commentService.getAllCommentsAdmin();
    res.render("comments", { comments: comments, user: req.session.member });
  } catch (err) {
    console.log("Error: getAllComments", err);
    res.redirect("/admin");
  }
};

adminController.updateComment = async (req: Request, res: Response) => {
  try {
    const input: any = req.body;
    const result = await commentService.updateCommentStatus({
      _id: input._id,
      commentStatus: input.commentStatus,
    });
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
      res.send(
        `<script> alert("HI: ${req.session.member.memberNick}")</script>`,
      );
    else res.send(`<script> alert("${Message.NOT_AUTHENTICATED}")</script>`);
  } catch (err) {
    console.log("Error: checkAuthSession", err);
    res.send(err);
  }
};

adminController.verifyAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.session?.member?.memberType === MemberType.ADMIN) {
    req.member = req.session.member;
    next();
  } else {
    const message = Message.NOT_ALLOWED;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/login')</script>`,
    );
  }
};

export default adminController;
