import MemberModel from "../schemas/Member.schema";
import EventModel from "../schemas/Event.schema";
import GroupModel from "../schemas/Group.schema";
import BoardModel from "../schemas/Board.schema";
import CommentModel from "../schemas/Comment.schema";
import {
  LoginInput,
  Member,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import Errors, { Message, HttpCode } from "../libs/Errors";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import * as bcrypt from "bcryptjs";
import { Types } from "mongoose";
import ViewService from "./View.service";
import { ViewGroup } from "../libs/enums/view.enum";
import { EventStatus } from "../libs/enums/event.enum";
import { GroupStatus } from "../libs/enums/group.enum";
import { BoardStatus } from "../libs/enums/board.enum";
import { CommentStatus } from "../libs/enums/comment.enum";

import { escapeRegExp } from "../libs/utils/helpers";

class MemberService {
  private readonly memberModel;
  private readonly eventModel;
  private readonly groupModel;
  private readonly boardModel;
  private readonly commentModel;
  private readonly viewService;

  constructor() {
    this.memberModel = MemberModel;
    this.eventModel = EventModel;
    this.groupModel = GroupModel;
    this.boardModel = BoardModel;
    this.commentModel = CommentModel;
    this.viewService = new ViewService();
  }

  /**
   * SPA: Signup (For Users and Organizations)
   */
  public async signup(input: MemberInput): Promise<Member> {
    if (
      input.memberType !== MemberType.USER &&
      input.memberType !== MemberType.ORG
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

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
      const resultJson: Member = result.toJSON();
      delete (resultJson as any).memberPassword;

      return resultJson;
    } catch (err) {
      console.log("Error, model:signup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_MEMBER_NICK);
    }
  }

  /**
   * SPA: Login
   */
  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 },
      )
      .exec();

    if (MemberStatus.BLOCK === member?.memberStatus) {
      throw new Errors(HttpCode.FORBIDDEN, Message.USER_BLOCKED);
    }
    if (MemberStatus.DELETE === member?.memberStatus) {
      throw new Errors(HttpCode.FORBIDDEN, Message.USER_DELETED);
    }
    if (!member)
      throw new Errors(HttpCode.NOT_FOUND, Message.WRONG_NICK_PASSWORD);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_NICK_PASSWORD);

    const fullMember = await this.memberModel.findById(member._id).exec();
    if (!fullMember)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const resultJson: Member = fullMember.toJSON();
    delete (resultJson as any).memberPassword;
    return resultJson;
  }

  /* BSSR: Admin Signup */
  public async processSignup(input: MemberInput): Promise<Member> {
    const exist = await this.memberModel
      .findOne({ memberType: MemberType.ADMIN })
      .exec();

    if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.ADMIN_EXISTS);

    const salt: string = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);
    input.memberStatus = MemberStatus.ACTIVE; // Admin is always active

    try {
      const result = await this.memberModel.create(input);

      const resultJson: Member = result.toJSON();
      delete (resultJson as any).memberPassword;

      return resultJson;
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_MEMBER_NICK);
    }
  }

  /* BSSR: Admin Login */
  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1, memberType: 1, memberStatus: 1 },
      )
      .exec();

    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // SECURITY: Only allow ADMIN members to log in via admin panel
    if (member.memberType !== MemberType.ADMIN) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );

    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_NICK_PASSWORD);
    }

    const result = await this.memberModel.findById(member._id).exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result.toJSON() as Member;
  }

  /** BSSR: Get All Users (Table) */
  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: { $ne: MemberType.ADMIN } })
      .exec();

    if (!result || result.length === 0) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    return result as Member[];
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

    return result.toJSON() as Member;
  }

  /** SPA: Update own profile */
  public async updateProfile(
    memberId: Types.ObjectId,
    input: MemberUpdateInput,
  ): Promise<Member> {
    const payload: any = {};
    const allowedFields: Array<keyof MemberUpdateInput> = [
      "memberNick",
      "memberPhone",
      "memberAddress",
      "memberDesc",
      "memberImage",
    ];

    for (const field of allowedFields) {
      if (
        input[field] !== undefined &&
        input[field] !== null &&
        input[field] !== ""
      ) {
        const value = String(input[field]).trim();
        if (value) {
          payload[field] = value;
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UPDATE_FAILED);
    }

    // Enforce uniqueness when user changes nick or phone
    if (payload.memberNick) {
      const duplicateNick = await this.memberModel
        .findOne({ memberNick: payload.memberNick, _id: { $ne: memberId } })
        .select({ _id: 1 })
        .lean()
        .exec();
      if (duplicateNick)
        throw new Errors(HttpCode.CONFLICT, Message.UPDATE_FAILED);
    }

    if (payload.memberPhone) {
      console.log(
        "Checking duplicate phone:",
        payload.memberPhone,
        "for memberId:",
        memberId,
      );
      const duplicatePhone = await this.memberModel
        .findOne({ memberPhone: payload.memberPhone, _id: { $ne: memberId } })
        .select({ _id: 1 })
        .lean()
        .exec();
      console.log("Duplicate phone result:", duplicatePhone);
      if (duplicatePhone)
        throw new Errors(HttpCode.CONFLICT, Message.UPDATE_FAILED);
    }

    const result = await this.memberModel
      .findByIdAndUpdate(memberId, { $set: payload }, { new: true })
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const json = result.toJSON();
    delete (json as any).memberPassword;

    return json as Member;
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
    direction?: "asc" | "desc";
    search?: string;
    onlyActive?: boolean;
  }): Promise<any[]> {
    const match: any = { memberType: MemberType.ORG };
    if (inquiry.onlyActive) match.memberStatus = MemberStatus.ACTIVE;
    if (inquiry.search)
      match.memberNick = {
        $regex: new RegExp(escapeRegExp(inquiry.search), "i"),
      };

    const dir = inquiry.direction === "asc" ? 1 : -1;
    const sort: any = { [inquiry.order || "createdAt"]: dir };

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

  /** SPA: Get Organizer detail (+ organized events/groups) */
  public async getOrganizerDetail(
    viewerId: Types.ObjectId | null,
    organizerId: string,
  ): Promise<any> {
    const member = await this.memberModel.findById(organizerId).exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (member.memberType !== MemberType.ORG)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

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

  /** SPA: Increment organizer views and return the updated count */
  public async viewOrganizer(
    viewerId: Types.ObjectId | null,
    organizerId: string,
  ): Promise<number> {
    const member = await this.memberModel.findById(organizerId).exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (member.memberType !== MemberType.ORG)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Do not count self-views
    if (viewerId && String(viewerId) === String(member._id)) {
      return member.memberViews ?? 0;
    }

    // Logged-in viewers: unique per viewer via View collection
    if (viewerId) {
      const newView = await this.viewService.insertMemberView({
        memberId: viewerId,
        viewRefId: member._id,
        viewGroup: ViewGroup.MEMBER,
      });

      if (!newView) {
        return member.memberViews ?? 0;
      }
    }

    const updated = await this.memberModel
      .findByIdAndUpdate(
        organizerId,
        { $inc: { memberViews: 1 } },
        { new: true },
      )
      .select({ memberViews: 1 })
      .lean()
      .exec();

    return (updated as any)?.memberViews ?? (member.memberViews ?? 0) + 1;
  }

  /** SPA: Get Top Organizers (ranked by engagement + output) */
  public async getTopOrganizers(limit = 4): Promise<any[]> {
    const safeLimit = Math.max(1, Math.min(20, Number(limit) || 4));

    const result = await this.memberModel
      .aggregate([
        {
          $match: {
            memberType: MemberType.ORG,
            memberStatus: MemberStatus.ACTIVE,
            isVerified: true,
          },
        },
        {
          $lookup: {
            from: "events",
            let: { orgId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$memberId", "$$orgId"] },
                      { $eq: ["$eventStatus", EventStatus.ACTIVE] },
                    ],
                  },
                },
              },
              { $project: { eventLikes: 1, eventViews: 1 } },
            ],
            as: "events",
          },
        },
        {
          // Pick a single representative banner image from the organizer's strongest event
          $lookup: {
            from: "events",
            let: { orgId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$memberId", "$$orgId"] },
                      { $eq: ["$eventStatus", EventStatus.ACTIVE] },
                    ],
                  },
                },
              },
              { $sort: { eventLikes: -1, eventViews: -1, createdAt: -1 } },
              { $limit: 1 },
              { $project: { eventImages: 1 } },
            ],
            as: "topEvent",
          },
        },
        {
          $lookup: {
            from: "boards",
            let: { orgId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$memberId", "$$orgId"] },
                      { $eq: ["$boardStatus", BoardStatus.ACTIVE] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "articles",
          },
        },
        {
          $lookup: {
            from: "comments",
            let: { articleIds: "$articles._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$articleId", "$$articleIds"] },
                      { $eq: ["$commentStatus", CommentStatus.ACTIVE] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "articleComments",
          },
        },
        {
          $addFields: {
            eventsCount: { $size: "$events" },
            eventsLikesTotal: { $sum: "$events.eventLikes" },
            eventsViewsTotal: { $sum: "$events.eventViews" },
            articlesCount: { $size: "$articles" },
            articleCommentsCount: { $size: "$articleComments" },
            bannerImage: {
              $let: {
                vars: { top: { $arrayElemAt: ["$topEvent", 0] } },
                in: { $arrayElemAt: ["$$top.eventImages", 0] },
              },
            },
          },
        },
        {
          $addFields: {
            // Simple weighted score: mixes organizer + event + content signals
            topScore: {
              $add: [
                { $multiply: ["$memberLikes", 3] },
                { $multiply: ["$memberViews", 1] },
                { $multiply: ["$eventsCount", 10] },
                { $multiply: ["$eventsLikesTotal", 2] },
                { $multiply: ["$eventsViewsTotal", 1] },
                { $multiply: ["$articlesCount", 4] },
                { $multiply: ["$articleCommentsCount", 1] },
              ],
            },
          },
        },
        { $sort: { topScore: -1, memberViews: -1, createdAt: -1 } },
        { $limit: safeLimit },
        {
          $project: {
            memberPassword: 0,
            events: 0,
            topEvent: 0,
            articles: 0,
            articleComments: 0,
          },
        },
      ])
      .exec();

    return result;
  }
}

export default MemberService;
