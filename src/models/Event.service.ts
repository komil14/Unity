import EventModel from "../schemas/Event.schema";
import { EventStatus } from "../libs/enums/event.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Event, EventInput, EventInquiry } from "../libs/types/event";
import { T } from "../libs/types/common";

class EventService {
  private readonly eventModel;

  constructor() {
    this.eventModel = EventModel;
  }

  /**
   * Create Event (Organization Only)
   */
  public async createEvent(input: EventInput): Promise<Event> {
    try {
      const result = await this.eventModel.create(input);
      return result.toJSON() as unknown as Event;
    } catch (err) {
      console.log("Error, model:createEvent", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /**
   * Get Single Event
   * (Optional: You can add view-counting logic here later)
   */
  public async getEvent(id: string): Promise<Event> {
    const event = await this.eventModel
      .findById(id)
      .exec();

    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.eventStatus === EventStatus.DELETE) {
        throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    return event.toJSON() as unknown as Event;
  }

  /**
   * Get All Events (Feed)
   * Uses Aggregation to Join with Member (Organization) data
   */
  public async getEvents(inquiry: EventInquiry): Promise<Event[]> {
    const match: T = { eventStatus: EventStatus.ACTIVE };

    // 1. Search Logic
    if (inquiry.search) {
      match.eventTitle = { $regex: new RegExp(inquiry.search, "i") };
    }

    // 2. Filter by Organization (Optional)
    if (inquiry.memberId) {
      match.memberId = inquiry.memberId;
    }

    // 3. Sorting Logic (Default: Newest created)
    const sort: T = { [inquiry.order || "createdAt"]: -1 };

    const result = await this.eventModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        { $skip: (inquiry.page * 1 - 1) * inquiry.limit }, // Pagination Skip
        { $limit: inquiry.limit * 1 },                     // Pagination Limit
        
        // JOIN: Fetch Creator (Organization) Details
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "memberData",
          },
        },
        // Unwind array to object (since memberId is unique, we get 1 result)
        { $unwind: "$memberData" },
      ])
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result as unknown as Event[];
  }
}

export default EventService;