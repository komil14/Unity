import MemberModel from "../schemas/Member.schema";
import EventModel from "../schemas/Event.schema";
import GroupModel from "../schemas/Group.schema";
import { LoginInput, Member, MemberInput } from "../libs/types/member";
import Errors, { Message, HttpCode } from "../libs/Errors";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import * as bcrypt from "bcryptjs";
import { Types } from "mongoose";
import ViewService from "./View.service";
import { ViewGroup } from "../libs/enums/view.enum";
import { EventStatus } from "../libs/enums/event.enum";
import { GroupStatus } from "../libs/enums/group.enum";

class MemberService {
  private readonly memberModel;
  private readonly eventModel;
  private readonly groupModel;
  private readonly viewService;

  constructor() {
    this.memberModel = MemberModel;
    this.eventModel = EventModel;
    this.groupModel = GroupModel;
    this.viewService = new ViewService();
  }

  /**
   * SPA: Signup (For Users and Organizations)
   */
  public async signup(input: MemberInput): Promise<Member> {
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    // Set status based on type: USER is ACTIVE, ORG is PENDING
    if (input.memberType === MemberType.ORG) {
      input.memberStatus = MemberStatus.PENDING;
    } else if (input.memberType === MemberType.USER) {
      input.memberStatus = MemberStatus.ACTIVE;
    }

    try {
      const result = await this.memberModel.create(input);
      const resultJson = result.toJSON();
      delete (resultJson as any).memberPassword;

      return resultJson as unknown as Member;
    } catch (err) {
      console.log("Error, model:signup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /**
   * SPA: Login
   */
  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 }
      )
      .exec();

    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);

    const fullMember = await this.memberModel.findById(member._id).exec();
    if (!fullMember)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const resultJson = fullMember.toJSON();
    delete (resultJson as any).memberPassword;
    return resultJson as unknown as Member;
  }

  /* BSSR: Admin Signup */
  public async processSignup(input: MemberInput): Promise<Member> {
    const exist = await this.memberModel
      .findOne({ memberType: MemberType.ADMIN })
      .exec();

    if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);

    const salt: string = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);
    input.memberStatus = MemberStatus.ACTIVE; // Admin is always active

    try {
      const result = await this.memberModel.create(input);

      const resultJson = result.toJSON();
      delete (resultJson as any).memberPassword;

      return resultJson as unknown as Member;
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /* BSSR: Admin Login */
  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1, memberType: 1, memberStatus: 1 }
      )
      .exec();

    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );

    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
    }

    const result = await this.memberModel.findById(member._id).exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result.toJSON() as unknown as Member;
  }

  /** BSSR: Get All Users (Table) */
  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: { $ne: MemberType.ADMIN } })
      .exec();

    if (!result || result.length === 0) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    return result as unknown as Member[];
  }
  /** BSSR: Update Status (ROBUST FIX) */
  public async updateMember(input: MemberInput): Promise<Member> {
    // Explicitly convert string ID to ObjectId to ensure MongoDB finds the doc
    const memberId = new Types.ObjectId(input._id as unknown as string);

    // Get the member to check type
    const member = await this.memberModel.findById(memberId).exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Set/remove verification badge based on org status
    const updateData: any = { memberStatus: input.memberStatus };
    if (member.memberType === MemberType.ORG) {
      if (input.memberStatus === MemberStatus.ACTIVE) {
        updateData.isVerified = true;
      } else if (
        input.memberStatus === MemberStatus.PENDING ||
        input.memberStatus === MemberStatus.BLOCK
      ) {
        updateData.isVerified = false;
      }
    }

    const result = await this.memberModel
      .findOneAndUpdate({ _id: memberId }, { $set: updateData }, { new: true })
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result.toJSON() as unknown as Member;
  }

  /** BSSR: Get Stats */
  public async getMemberStats(): Promise<any> {
    const total = await this.memberModel.countDocuments();
    const active = await this.memberModel.countDocuments({
      memberStatus: MemberStatus.ACTIVE,
    });
    const blocked = await this.memberModel.countDocuments({
      memberStatus: MemberStatus.BLOCK,
    });
    const pending = await this.memberModel.countDocuments({
      memberStatus: MemberStatus.PENDING,
    });

    // Count New Users (Last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newUsers = await this.memberModel.countDocuments({
      memberType: MemberType.USER,
      createdAt: { $gte: last24h },
    });

    return { total, active, blocked, pending, newUsers };
  }

  /** SPA: Get Organizers (ORG accounts) */
  public async getOrganizers(inquiry: {
    page: number;
    limit: number;
    order?: string;
    search?: string;
    onlyActive?: boolean;
  }): Promise<any[]> {
    const match: any = { memberType: MemberType.ORG };
    if (inquiry.onlyActive) match.memberStatus = MemberStatus.ACTIVE;
    if (inquiry.search)
      match.memberNick = { $regex: new RegExp(inquiry.search, "i") };

    const sort: any = { [inquiry.order || "createdAt"]: -1 };

    // Provide counts similar to eventify (events/groups organized)
    const result = await this.memberModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
        { $limit: inquiry.limit * 1 },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "memberId",
            as: "organizedEvents",
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "_id",
            foreignField: "memberId",
            as: "organizedGroups",
          },
        },
        {
          $addFields: {
            eventsOrganizedCount: { $size: "$organizedEvents" },
            groupsOrganizedCount: { $size: "$organizedGroups" },
          },
        },
        {
          $project: {
            organizedEvents: 0,
            organizedGroups: 0,
            memberPassword: 0,
          },
        },
      ])
      .exec();

    return result;
  }

  /** SPA: Get Organizer detail (+ view counting + organized events/groups) */
  public async getOrganizerDetail(
    viewerId: Types.ObjectId | null,
    organizerId: string
  ): Promise<any> {
    const member = await this.memberModel.findById(organizerId).exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (member.memberType !== MemberType.ORG)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // View counting (only for logged-in viewers)
    if (viewerId) {
      const newView = await this.viewService.insertMemberView({
        memberId: viewerId,
        viewRefId: member._id,
        viewGroup: ViewGroup.MEMBER,
      });

      if (newView) {
        await this.memberModel
          .findByIdAndUpdate(organizerId, { $inc: { memberViews: 1 } })
          .exec();
      }
    }

    const memberJson = member.toJSON() as any;
    delete memberJson.memberPassword;

    const organizedEvents = await this.eventModel
      .find({ memberId: member._id, eventStatus: EventStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    const organizedGroups = await this.groupModel
      .find({ memberId: member._id, groupStatus: GroupStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    return {
      ...memberJson,
      eventsOrganizedCount: organizedEvents.length,
      groupsOrganizedCount: organizedGroups.length,
      organizedEvents: organizedEvents.map((e: any) => e.toJSON()),
      organizedGroups: organizedGroups.map((g: any) => g.toJSON()),
    };
  }
}

export default MemberService;
