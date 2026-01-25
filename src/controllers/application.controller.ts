import { Response } from "express";
import { T } from "../libs/types/common";
import ApplicationService from "../models/Application.service";
import { AdminRequest } from "../libs/types/member";
import { ApplicationInput } from "../libs/types/application";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";

const applicationService = new ApplicationService();
const applicationController: T = {};

/**
 * POST /application/join
 * Requires: User Token
 */
applicationController.joinEvent = async (req: AdminRequest, res: Response) => {
  try {
    console.log("Join Event Body:", req.body);

    // 1. Security: Only USER can join (Orgs cannot join events)
    if (req.member.memberType !== MemberType.USER) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const input: ApplicationInput = req.body;
    input.memberId = req.member._id; // Inject ID from token

    const result = await applicationService.createApplication(input);

    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, joinEvent:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/**
 * GET /application/my
 * Returns list of events I joined
 */
applicationController.getMyApplications = async (
  req: AdminRequest,
  res: Response,
) => {
  try {
    const memberId = req.member._id;
    const result = await applicationService.getMyApplications(memberId);

    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getMyApplications:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/**
 * GET /event/:id/attendees
 * Returns approved attendees for an event
 */
applicationController.getEventAttendees = async (
  req: AdminRequest,
  res: Response,
) => {
  try {
    const eventId = req.params.id;
    const limit = Number(req.query.limit) || 12;

    const attendees = await applicationService.getEventAttendees(
      eventId,
      limit,
    );
    res.status(200).json(attendees);
  } catch (err: any) {
    console.log("Error, getEventAttendees:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default applicationController;
