import EventModel from "../schemas/Event.schema";
import ViewService from "./View.service";
import { EventStatus } from "../libs/enums/event.enum";
import { ViewGroup } from "../libs/enums/view.enum";
import { ViewInput } from "../libs/types/view";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Event, EventInput, EventInquiry } from "../libs/types/event";
import { T } from "../libs/types/common";
import { Types } from "mongoose";

class EventService {
  private readonly eventModel;
  private readonly viewService;

  constructor() {
    this.eventModel = EventModel;
    this.viewService = new ViewService();
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

  public async getEvent(
    memberId: Types.ObjectId | null,
    id: string
  ): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();

    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.eventStatus === EventStatus.DELETE) {
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
    return event.toJSON() as unknown as Event;
  }

  public async getEvents(inquiry: EventInquiry): Promise<Event[]> {
    const match: T = { eventStatus: EventStatus.ACTIVE };
    if (inquiry.search)
      match.eventTitle = { $regex: new RegExp(inquiry.search, "i") };
    if (inquiry.memberId) match.memberId = inquiry.memberId;

    const sort: T = { [inquiry.order || "createdAt"]: -1 };

    const result = await this.eventModel
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
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result as unknown as Event[];
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
    return result as unknown as Event[];
  }

  /** BSSR: Update Event Status (ROBUST FIX) */
  public async updateEventStatus(input: any): Promise<any> {
    const eventId = new Types.ObjectId(input._id as string); // Explicit Cast
    const result = await this.eventModel
      .findOneAndUpdate(
        { _id: eventId }, 
        { $set: { eventStatus: input.eventStatus } }, 
        { new: true }
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toJSON() as unknown as any;
  }

  /** BSSR: Count Events & New Logic */
  public async getEventStats(): Promise<any> {
    const total = await this.eventModel.countDocuments();
    
    // Count Events created in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newEvents = await this.eventModel.countDocuments({ createdAt: { $gte: last24h } });

    return { total, newEvents };
  }
  
  // You can keep countEvents() if you use it elsewhere, or replace it with this.
  public async countEvents(): Promise<number> {
    return await this.eventModel.countDocuments();
  }
}

export default EventService;
