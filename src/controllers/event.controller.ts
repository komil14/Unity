import { Request, Response } from "express";
import path from "path";
import { T } from "../libs/types/common";
import EventService from "../models/Event.service";
import { EventInquiry, EventInput } from "../libs/types/event";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";
import { AdminRequest } from "../libs/types/member";

import { Types } from "mongoose";

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

    // Image Handling - store only filenames so views can build `/uploads/<folder>/<filename>` URLs
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0))
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);

    const filenames = (req.files as Express.Multer.File[]).map(
      (file) => file.filename || path.basename(file.path || ""),
    );
    input.eventImages = filenames;

    // Inject Creator
    input.memberId = req.member._id;

    const result = await eventService.createEvent(input);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, createEvent:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** PATCH: Update Event */
eventController.updateEvent = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const input: Partial<EventInput> = req.body;

    // Handle new images if uploaded
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const filenames = (req.files as Express.Multer.File[]).map(
        (file) => file.filename || path.basename(file.path || ""),
      );
      input.eventImages = filenames;
    }

    const result = await eventService.updateEvent(req.member, id, input);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, updateEvent:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: All Events (Feed) */
eventController.getEvents = async (req: Request, res: Response) => {
  try {
    const startDateRaw = req.query.startDate
      ? String(req.query.startDate)
      : undefined;
    const endDateRaw = req.query.endDate
      ? String(req.query.endDate)
      : undefined;

    const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
    const endDate = endDateRaw ? new Date(endDateRaw) : undefined;
    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }

    // If provided as YYYY-MM-DD, make endDate inclusive (end of day).
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    const directionRaw = req.query.direction
      ? String(req.query.direction)
      : undefined;
    const direction =
      directionRaw === "asc" || directionRaw === "desc"
        ? directionRaw
        : undefined;

    const inquiry: EventInquiry = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 5,
      order: req.query.order ? String(req.query.order) : "createdAt",
      direction,
      search: req.query.search ? String(req.query.search) : undefined,
      startDate,
      endDate,
      memberId: req.query.memberId
        ? new Types.ObjectId(String(req.query.memberId))
        : undefined,
    };

    const result = await eventService.getEvents(inquiry);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getEvents:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
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
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: Weekly Popular Events (by % volunteers applied) */
eventController.getWeeklyPopularEvents = async (
  req: Request,
  res: Response,
) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 7;
    const limit = req.query.limit ? Number(req.query.limit) : 4;

    const result = await eventService.getWeeklyPopularEvents({ days, limit });
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getWeeklyPopularEvents:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** PATCH: Change Event Status */
eventController.changeEventStatus = async (
  req: AdminRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { eventStatus } = req.body;

    const result = await eventService.changeEventStatus(
      req.member,
      id,
      eventStatus,
    );

    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, changeEventStatus:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** DELETE: Remove Event */
eventController.deleteEvent = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await eventService.deleteEvent(req.member, id);

    res
      .status(200)
      .json({ message: "Event deleted successfully", data: result });
  } catch (err: any) {
    console.log("Error, deleteEvent:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default eventController;
