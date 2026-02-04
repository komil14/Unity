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
    // 1. Check if any application exists (active or canceled)
    const exist = await this.applicationModel
      .findOne({
        memberId: input.memberId,
        eventId: input.eventId,
      })
      .exec();

    // If there's an active application (PENDING/APPROVED), block it
    if (
      exist &&
      (exist.applicationStatus === ApplicationStatus.PENDING ||
        exist.applicationStatus === ApplicationStatus.APPROVED)
    ) {
      throw new Errors(HttpCode.CONFLICT, Message.CREATE_FAILED); // "Already Joined"
    }

    // 2. Check: Is Event valid and has space?
    const event = await this.eventModel.findById(input.eventId).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    if (event.eventJoined >= event.eventCapacity) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED); // "Event Full"
    }

    try {
      let result;

      // If a canceled/rejected application exists, reactivate it
      if (
        exist &&
        (exist.applicationStatus === ApplicationStatus.CANCELED ||
          exist.applicationStatus === ApplicationStatus.REJECTED)
      ) {
        result = await this.applicationModel
          .findByIdAndUpdate(
            exist._id,
            {
              applicationStatus: ApplicationStatus.PENDING,
              applicationNote: input.applicationNote || exist.applicationNote,
              updatedAt: new Date(),
            },
            { new: true },
          )
          .exec();
      } else {
        // 3. Create new Application if no previous record exists
        result = await this.applicationModel.create(input);
      }

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
  public async cancelApplication(memberId: any, eventId: any): Promise<any> {
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

    if (!application)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Decrement eventJoined count, not below zero
    await this.eventModel
      .findByIdAndUpdate(eventObjectId, { $inc: { eventJoined: -1 } })
      .exec();

    return application.toJSON();
  }

  /**
   * Get attendees for an event (all statuses for organizer management)
   */
  public async getEventAttendees(eventId: string, limit = 12): Promise<any[]> {
    const eventObjectId = new Types.ObjectId(eventId);

    const attendees = await this.applicationModel
      .aggregate([
        {
          $match: {
            eventId: eventObjectId,
          },
        },
        { $sort: { createdAt: -1 } },
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
              memberDesc: "$memberData.memberDesc",
              memberStatus: "$memberData.memberStatus",
            },
          },
        },
      ])
      .exec();

    return attendees;
  }

  /**
   * Approve an application (organizer action)
   * Validates that only the event organizer can approve
   */
  public async approveApplication(
    applicationId: any,
    organizerId: any,
  ): Promise<any> {
    const appObjectId =
      typeof applicationId === "string"
        ? new Types.ObjectId(applicationId)
        : applicationId;
    const orgObjectId =
      typeof organizerId === "string"
        ? new Types.ObjectId(organizerId)
        : organizerId;

    // Get the application and its event
    const application = await this.applicationModel
      .findById(appObjectId)
      .exec();
    if (!application)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Verify organizer owns the event
    const event = await this.eventModel.findById(application.eventId).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.memberId.toString() !== orgObjectId.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const updated = await this.applicationModel
      .findByIdAndUpdate(
        appObjectId,
        {
          applicationStatus: ApplicationStatus.APPROVED,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updated) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return updated.toJSON();
  }

  /**
   * Reject an application (organizer action)
   * Validates that only the event organizer can reject
   */
  public async rejectApplication(
    applicationId: any,
    organizerId: any,
  ): Promise<any> {
    const appObjectId =
      typeof applicationId === "string"
        ? new Types.ObjectId(applicationId)
        : applicationId;
    const orgObjectId =
      typeof organizerId === "string"
        ? new Types.ObjectId(organizerId)
        : organizerId;

    // Get the application and its event
    const application = await this.applicationModel
      .findById(appObjectId)
      .exec();
    if (!application)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Verify organizer owns the event
    const event = await this.eventModel.findById(application.eventId).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.memberId.toString() !== orgObjectId.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const updated = await this.applicationModel
      .findByIdAndUpdate(
        appObjectId,
        {
          applicationStatus: ApplicationStatus.REJECTED,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updated) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return updated.toJSON();
  }

  /**
   * Complete an application (organizer action)
   * Validates that only the event organizer can complete
   */
  public async completeApplication(
    applicationId: any,
    organizerId: any,
  ): Promise<any> {
    const appObjectId =
      typeof applicationId === "string"
        ? new Types.ObjectId(applicationId)
        : applicationId;
    const orgObjectId =
      typeof organizerId === "string"
        ? new Types.ObjectId(organizerId)
        : organizerId;

    const application = await this.applicationModel
      .findById(appObjectId)
      .exec();
    if (!application)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const event = await this.eventModel.findById(application.eventId).exec();
    if (!event) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (event.memberId.toString() !== orgObjectId.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    if (application.applicationStatus !== ApplicationStatus.APPROVED) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NOT_ALLOWED);
    }

    const updated = await this.applicationModel
      .findByIdAndUpdate(
        appObjectId,
        {
          applicationStatus: ApplicationStatus.COMPLETED,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!updated) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return updated.toJSON();
  }
}

export default ApplicationService;
