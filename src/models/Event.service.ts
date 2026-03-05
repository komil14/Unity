import EventModel from "../schemas/Event.schema";
import ApplicationModel from "../schemas/Application.schema";
import MemberModel from "../schemas/Member.schema";
import ViewService from "./View.service";
import { EventStatus } from "../libs/enums/event.enum";
import { ViewGroup } from "../libs/enums/view.enum";
import { ViewInput } from "../libs/types/view";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Event, EventInput, EventInquiry } from "../libs/types/event";
import { T } from "../libs/types/common";
import { Types } from "mongoose";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";

import { escapeRegExp } from "../libs/utils/helpers";

class EventService {
  private readonly eventModel;
  private readonly applicationModel;
  private readonly memberModel;
  private readonly viewService;

  constructor() {
    this.eventModel = EventModel;
    this.applicationModel = ApplicationModel;
    this.memberModel = MemberModel;
    this.viewService = new ViewService();
  }

  /**
   * Helper: Clean image paths (remove absolute paths, keep only filename)
   */
  private sanitizeImagePaths(images: string[]): string[] {
    return images.map((img) => {
      // If contains path separators, extract just the filename
      if (img.includes("/") || img.includes("\\")) {
        return img.split(/[/\\]/).pop() || img;
      }
      return img;
    });
  }

  public async createEvent(input: EventInput): Promise<Event> {
    const exist = await this.eventModel
      .findOne({
        memberId: input.memberId,
        eventTitle: input.eventTitle,
        eventDate: input.eventDate,
      })
      .exec();

    if (exist) throw new Errors(HttpCode.CONFLICT, Message.CREATE_FAILED);
    try {
      const result = await this.eventModel.create(input);
      return result.toJSON() as unknown as Event;
    } catch (err) {
      console.log("Error, model:createEvent", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async updateEvent(
    member: { _id: Types.ObjectId; memberType: MemberType },
    id: string,
    input: Partial<EventInput>,
  ): Promise<Event> {
    if (member.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    // Verify organizer owns this event
    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.memberId.toString() !== member._id.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    // Prevent updating status via this endpoint (use changeEventStatus instead)
    if (input.eventStatus) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }

    try {
      const updateData: T = {};
      if (input.eventTitle) updateData.eventTitle = input.eventTitle;
      if (input.eventDesc) updateData.eventDesc = input.eventDesc;
      if (input.eventLocation) updateData.eventLocation = input.eventLocation;
      if (input.eventDate) updateData.eventDate = input.eventDate;
      if (input.eventCapacity !== undefined)
        updateData.eventCapacity = input.eventCapacity;
      if (input.eventPoints !== undefined)
        updateData.eventPoints = input.eventPoints;
      if (input.eventImages && input.eventImages.length > 0) {
        updateData.eventImages = this.sanitizeImagePaths(input.eventImages);
      }

      const result = await this.eventModel
        .findByIdAndUpdate(id, { $set: updateData }, { new: true })
        .exec();

      if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
      return result.toJSON() as unknown as Event;
    } catch (err: any) {
      console.log("Error, model:updateEvent", err);
      if (err instanceof Errors) throw err;
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }
  }

  public async getEvent(
    memberId: Types.ObjectId | null,
    id: string,
  ): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();

    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    // Only hide deleted events from public; allow organizer to view for modification
    if (event.eventStatus === EventStatus.DELETE && memberId === null) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    if (memberId) {
      const viewInput: ViewInput = {
        memberId: memberId,
        viewRefId: event._id,
        viewGroup: ViewGroup.EVENT,
      };
      const newView = await this.viewService.insertMemberView(viewInput);
      if (newView) {
        await this.eventModel
          .findByIdAndUpdate(id, { $inc: { eventViews: 1 } })
          .exec();
        event.eventViews++;
      }
    }

    // Use aggregation to populate memberData (organizer info)
    const eventWithMember = await this.eventModel
      .aggregate([
        { $match: { _id: event._id } },
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "memberData",
          },
        },
        { $unwind: "$memberData" },
        {
          $project: {
            "memberData.memberPassword": 0,
          },
        },
      ])
      .exec();

    if (!eventWithMember || eventWithMember.length === 0) {
      // Fallback: return event without memberData
      const eventData = event.toJSON() as unknown as Event;
      if (eventData.eventImages) {
        eventData.eventImages = this.sanitizeImagePaths(eventData.eventImages);
      }
      return eventData;
    }

    const eventData = eventWithMember[0] as any;
    // Update view count in the response
    eventData.eventViews = event.eventViews;

    // Sanitize image paths before returning
    if (eventData.eventImages) {
      eventData.eventImages = this.sanitizeImagePaths(eventData.eventImages);
    }
    return eventData;
  }

  /**
   * Record a view for an event (called separately by frontend)
   */
  public async viewEvent(
    memberId: Types.ObjectId | null,
    id: string,
  ): Promise<number> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    if (memberId) {
      const viewInput: ViewInput = {
        memberId: memberId,
        viewRefId: event._id,
        viewGroup: ViewGroup.EVENT,
      };
      const newView = await this.viewService.insertMemberView(viewInput);
      if (newView) {
        await this.eventModel
          .findByIdAndUpdate(id, { $inc: { eventViews: 1 } })
          .exec();
        return event.eventViews + 1;
      }
    }
    return event.eventViews;
  }

  /**
   * Duplicate an event (create a copy with new date)
   */
  public async duplicateEvent(
    member: { _id: Types.ObjectId; memberType: MemberType },
    id: string,
  ): Promise<Event> {
    if (member.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.memberId.toString() !== member._id.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const duplicateInput: EventInput = {
      eventTitle: `${event.eventTitle} (Copy)`,
      eventDesc: event.eventDesc,
      eventLocation: event.eventLocation,
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      eventCapacity: event.eventCapacity,
      eventPoints: event.eventPoints,
      eventImages: event.eventImages || [],
      memberId: member._id,
    };

    try {
      const result = await this.eventModel.create(duplicateInput);
      return result.toJSON() as unknown as Event;
    } catch (err) {
      console.log("Error, model:duplicateEvent", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getEvents(inquiry: EventInquiry): Promise<{
    items: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const match: T = {};

    // If fetching organizer's own events, include ACTIVE and CANCELED
    // If fetching public feed, only show ACTIVE
    if (inquiry.memberId) {
      match.memberId = inquiry.memberId;
      match.eventStatus = {
        $in: [EventStatus.ACTIVE, EventStatus.CANCELED, EventStatus.DELETE],
      };
    } else {
      match.eventStatus = EventStatus.ACTIVE;
    }

    if (inquiry.search)
      match.eventTitle = {
        $regex: new RegExp(escapeRegExp(inquiry.search), "i"),
      };

    if (inquiry.startDate || inquiry.endDate) {
      match.eventDate = {};
      if (inquiry.startDate) match.eventDate.$gte = inquiry.startDate;
      if (inquiry.endDate) match.eventDate.$lte = inquiry.endDate;
    }

    const dir = inquiry.direction === "asc" ? 1 : -1;
    const sort: T = { [inquiry.order || "createdAt"]: dir };

    const [result, total] = await Promise.all([
      this.eventModel
        .aggregate([
          { $match: match },
          { $sort: sort },
          { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
          { $limit: inquiry.limit * 1 },
          {
            $lookup: {
              from: "members",
              localField: "memberId",
              foreignField: "_id",
              as: "memberData",
            },
          },
          { $unwind: "$memberData" },
        ])
        .exec(),
      this.eventModel.countDocuments(match),
    ]);

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Sanitize image paths for all events
    const sanitizedResult = result.map((event: any) => {
      if (event.eventImages) {
        event.eventImages = this.sanitizeImagePaths(event.eventImages);
      }
      return event;
    });

    const totalPages = Math.max(1, Math.ceil(total / inquiry.limit));

    return {
      items: sanitizedResult as unknown as Event[],
      total,
      page: inquiry.page,
      limit: inquiry.limit,
      totalPages,
    };
  }

  /**
   * Get weekly-popular events: ranked by % of volunteers who applied in the last N days.
   * weeklyApplyRate = weeklyApplicants / totalVolunteers * 100
   */
  public async getWeeklyPopularEvents(input?: {
    days?: number;
    limit?: number;
  }): Promise<any[]> {
    const daysRaw = input?.days ?? 7;
    const limitRaw = input?.limit ?? 4;

    const days = Number.isFinite(daysRaw)
      ? Math.max(1, Math.min(30, Math.floor(daysRaw)))
      : 7;
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(20, Math.floor(limitRaw)))
      : 4;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const totalVolunteers = await this.memberModel.countDocuments({
      memberType: MemberType.USER,
      memberStatus: MemberStatus.ACTIVE,
    });

    const agg = await this.applicationModel
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: "$eventId",
            weeklyApplicants: { $sum: 1 },
          },
        },
        { $sort: { weeklyApplicants: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: "$event" },
        { $match: { "event.eventStatus": EventStatus.ACTIVE } },
        {
          $lookup: {
            from: "members",
            localField: "event.memberId",
            foreignField: "_id",
            as: "memberData",
          },
        },
        { $unwind: "$memberData" },
        {
          $addFields: {
            weeklyApplyRate: {
              $cond: [
                { $gt: [totalVolunteers, 0] },
                {
                  $multiply: [
                    { $divide: ["$weeklyApplicants", totalVolunteers] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            _id: "$event._id",
            eventTitle: "$event.eventTitle",
            eventDesc: "$event.eventDesc",
            eventLocation: "$event.eventLocation",
            eventDate: "$event.eventDate",
            eventCapacity: "$event.eventCapacity",
            eventJoined: "$event.eventJoined",
            eventImages: "$event.eventImages",
            eventPoints: "$event.eventPoints",
            memberId: "$event.memberId",
            eventLikes: "$event.eventLikes",
            eventViews: "$event.eventViews",
            createdAt: "$event.createdAt",
            updatedAt: "$event.updatedAt",
            memberData: 1,
            weeklyApplicants: 1,
            weeklyApplyRate: 1,
          },
        },
        { $sort: { weeklyApplyRate: -1, weeklyApplicants: -1 } },
      ])
      .exec();

    const sanitized = (agg ?? []).map((event: any) => {
      if (event.eventImages) {
        event.eventImages = this.sanitizeImagePaths(event.eventImages);
      }
      return event;
    });

    return sanitized;
  }

  /** BSSR: Get All Events (For Admin) */
  public async getAllEventsAdmin(): Promise<Event[]> {
    const result = await this.eventModel
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "memberData",
          },
        },
        { $unwind: "$memberData" },
      ])
      .exec();

    // Sanitize image paths for all events
    const sanitizedResult = result.map((event: any) => {
      if (event.eventImages) {
        event.eventImages = this.sanitizeImagePaths(event.eventImages);
      }
      return event;
    });

    return sanitizedResult as unknown as Event[];
  }

  /** BSSR: Update Event Status (ROBUST FIX) */
  public async updateEventStatus(input: any): Promise<any> {
    const eventId = new Types.ObjectId(input._id as string); // Explicit Cast
    const result = await this.eventModel
      .findOneAndUpdate(
        { _id: eventId },
        { $set: { eventStatus: input.eventStatus } },
        { new: true },
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toJSON() as unknown as any;
  }

  public async changeEventStatus(
    member: { _id: Types.ObjectId; memberType: MemberType },
    id: string,
    eventStatus: string,
  ): Promise<any> {
    if (member.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    if (!eventStatus) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }

    const validStatuses = ["ACTIVE", "CANCELED"];
    if (!validStatuses.includes(eventStatus)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }

    const event = await this.getEvent(member._id, id);
    if (event.memberId.toString() !== member._id.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    return this.updateEventStatus({ _id: id, eventStatus });
  }

  public async deleteEvent(
    member: { _id: Types.ObjectId; memberType: MemberType },
    id: string,
  ): Promise<any> {
    if (member.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const event = await this.getEvent(member._id, id);
    if (event.memberId.toString() !== member._id.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    return this.updateEventStatus({ _id: id, eventStatus: EventStatus.DELETE });
  }

  /** BSSR: Count Events & New Logic */
  public async getEventStats(): Promise<any> {
    const total = await this.eventModel.countDocuments();

    // Count Events created in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newEvents = await this.eventModel.countDocuments({
      createdAt: { $gte: last24h },
    });

    return { total, newEvents };
  }

  // You can keep countEvents() if you use it elsewhere, or replace it with this.
  public async countEvents(): Promise<number> {
    return await this.eventModel.countDocuments();
  }
}

export default EventService;
