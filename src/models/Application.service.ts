import ApplicationModel from "../schemas/Application.schema";
import EventModel from "../schemas/Event.schema";
import { ApplicationInput } from "../libs/types/application";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { ApplicationStatus } from "../libs/enums/application.enum";
import { T } from "../libs/types/common";
import { Types } from "mongoose";

class ApplicationService {
  private readonly applicationModel;
  private readonly eventModel;

  constructor() {
    this.applicationModel = ApplicationModel;
    this.eventModel = EventModel;
  }

  /**
   * Process Application (User Joins Event)
   */
  public async createApplication(input: ApplicationInput): Promise<any> {
    // 1. Check: Did user already apply?
    const exist = await this.applicationModel
      .findOne({ memberId: input.memberId, eventId: input.eventId })
      .exec();

    if (exist) {
      throw new Errors(HttpCode.CONFLICT, Message.CREATE_FAILED); // "Already Joined"
    }

    // 2. Check: Is Event valid and has space?
    const event = await this.eventModel.findById(input.eventId).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    if (event.eventJoined >= event.eventCapacity) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED); // "Event Full"
    }

    try {
      // 3. Create Application
      const result = await this.applicationModel.create(input);

      // 4. Update Event: Increment participant count (+1)
      await this.eventModel
        .findByIdAndUpdate(input.eventId, { $inc: { eventJoined: 1 } })
        .exec();

      return result;
    } catch (err) {
      console.log("Error, model:createApplication", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /**
   * Get My Applications (For User Dashboard)
   */
  public async getMyApplications(memberId: any): Promise<any[]> {
    // Convert string ID to ObjectId if needed
    const memberObjectId =
      typeof memberId === "string" ? new Types.ObjectId(memberId) : memberId;

    const results = await this.applicationModel
      .aggregate([
        { $match: { memberId: memberObjectId } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "eventData",
          },
        },
        { $unwind: "$eventData" }, // Flatten the array
      ])
      .exec();

    return results;
  }

  /**
   * Get current user's application status for an event
   */
  public async getApplicationStatus(
    memberId: any,
    eventId: any,
  ): Promise<any | null> {
    const memberObjectId =
      typeof memberId === "string" ? new Types.ObjectId(memberId) : memberId;
    const eventObjectId =
      typeof eventId === "string" ? new Types.ObjectId(eventId) : eventId;

    const application = await this.applicationModel
      .findOne({ memberId: memberObjectId, eventId: eventObjectId })
      .exec();

    return application ? application.toJSON() : null;
  }

  /**
   * Cancel/withdraw an application (user-owned)
   */
  public async cancelApplication(
    memberId: any,
    eventId: any,
  ): Promise<any> {
    const memberObjectId =
      typeof memberId === "string" ? new Types.ObjectId(memberId) : memberId;
    const eventObjectId =
      typeof eventId === "string" ? new Types.ObjectId(eventId) : eventId;

    const application = await this.applicationModel
      .findOneAndUpdate(
        {
          memberId: memberObjectId,
          eventId: eventObjectId,
          applicationStatus: { $ne: ApplicationStatus.CANCELED },
        },
        { applicationStatus: ApplicationStatus.CANCELED },
        { new: true },
      )
      .exec();

    if (!application) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Decrement eventJoined count, not below zero
    await this.eventModel
      .findByIdAndUpdate(eventObjectId, { $inc: { eventJoined: -1 } })
      .exec();

    return application.toJSON();
  }

  /**
   * Get attendees for an event (approved applications)
   */
  public async getEventAttendees(eventId: string, limit = 12): Promise<any[]> {
    const eventObjectId = new Types.ObjectId(eventId);

    const attendees = await this.applicationModel
      .aggregate([
        {
          $match: {
            eventId: eventObjectId,
            applicationStatus: ApplicationStatus.APPROVED,
          },
        },
        { $sort: { createdAt: 1 } },
        { $limit: limit },
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
            _id: 1,
            applicationStatus: 1,
            memberId: 1,
            eventId: 1,
            createdAt: 1,
            memberData: {
              _id: "$memberData._id",
              memberNick: "$memberData.memberNick",
              memberImage: "$memberData.memberImage",
              memberType: "$memberData.memberType",
              isVerified: "$memberData.isVerified",
            },
          },
        },
      ])
      .exec();

    return attendees;
  }
}

export default ApplicationService;
