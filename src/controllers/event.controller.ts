import { Request, Response } from "express";
import { T } from "../libs/types/common";
import EventService from "../models/Event.service";
import { EventInquiry, EventInput } from "../libs/types/event";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";
import { AdminRequest } from "../libs/types/member";

const eventService = new EventService();
const eventController: T = {};

/** POST: Create Event */
eventController.createEvent = async (req: AdminRequest, res: Response) => {
  try {
    // Security: Only Organizations can create events
    if (req.member.memberType !== MemberType.ORG) {
        throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const input: EventInput = req.body;
    
    // Image Handling
    if (!req.file) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    input.eventImages = [req.file.path.replace(/\\/g, "/")];
    
    // Inject Creator
    input.memberId = req.member._id;

    const result = await eventService.createEvent(input);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, createEvent:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: All Events (Feed) */
eventController.getEvents = async (req: Request, res: Response) => {
  try {
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

/** GET: Single Event Detail (With View Counting) */
eventController.getEvent = async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // If user is logged in (via retrieveAuth), pass their ID. Otherwise pass null.
        const memberId = req.member?._id ?? null; 
        
        const result = await eventService.getEvent(memberId, id);
        res.status(200).json(result);
    } catch (err: any) {
        console.log("Error, getEvent:", err);
        if (err instanceof Errors) res.status(err.code).json({ message: err.message });
        else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
    }
}

export default eventController;