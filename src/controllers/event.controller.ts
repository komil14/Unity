import { Request, Response } from "express";
import { T } from "../libs/types/common";
import EventService from "../models/Event.service";
import { EventInquiry, EventInput } from "../libs/types/event";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";

const eventService = new EventService();
const eventController: T = {};

/**
 * POST /event/create
 * Requires: Token (Org), Image (Multer)
 */
eventController.createEvent = async (req: any, res: Response) => {
  try {
    console.log("CreateEvent Body:", req.body);
    
    // 1. Security Check: Only ORG can create events
    // (req.member is injected by the Auth Middleware we will build next)
    if (req.member.memberType !== MemberType.ORG) {
        throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const input: EventInput = req.body;

    // 2. Handle Image: Multer puts the file in req.file
    if (!req.file) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    // Windows users might get backslashes, normalize to forward slashes
    input.eventImages = [req.file.path.replace(/\\/g, "/")];

    // 3. Inject Creator ID from Token
    input.memberId = req.member._id;

    // 4. Call Service
    const result = await eventService.createEvent(input);

    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, createEvent:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/**
 * GET /event/all
 * Public Route
 */
eventController.getEvents = async (req: Request, res: Response) => {
  try {
    // Parse Query Params
    const inquiry: EventInquiry = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 5,
      order: req.query.order ? String(req.query.order) : "createdAt",
      search: req.query.search ? String(req.query.search) : undefined,
    };

    const result = await eventService.getEvents(inquiry);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getEvents:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default eventController;