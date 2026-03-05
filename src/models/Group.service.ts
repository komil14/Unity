import { Types } from "mongoose";

import GroupModel from "../schemas/Group.schema";
import GroupMemberModel from "../schemas/GroupMember.schema";
import MemberModel from "../schemas/Member.schema";

import ViewService from "./View.service";
import { ViewGroup } from "../libs/enums/view.enum";

import Errors, { HttpCode, Message } from "../libs/Errors";
import {
  Group,
  GroupInput,
  GroupInquiry,
  GroupUpdateInput,
} from "../libs/types/group";
import { GroupMemberRole, GroupStatus } from "../libs/enums/group.enum";

import { escapeRegExp } from "../libs/utils/helpers";

class GroupService {
  private readonly groupModel;
  private readonly groupMemberModel;
  private readonly memberModel;
  private readonly viewService;

  constructor() {
    this.groupModel = GroupModel;
    this.groupMemberModel = GroupMemberModel;
    this.memberModel = MemberModel;
    this.viewService = new ViewService();
  }

  private normalizeCategories(categories?: string[] | string): string[] {
    if (!categories) return [];
    if (Array.isArray(categories))
      return categories.map(String).filter(Boolean);
    // Accept comma-separated string
    return String(categories)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private sanitizeImagePath(image?: string): string {
    if (!image) return "";
    if (image.includes("/") || image.includes("\\")) {
      return image.split(/[/\\]/).pop() || image;
    }
    return image;
  }

  public async createGroup(input: GroupInput): Promise<Group> {
    const exist = await this.groupModel
      .findOne({ memberId: input.memberId, groupName: input.groupName })
      .exec();

    if (exist) throw new Errors(HttpCode.CONFLICT, Message.CREATE_FAILED);

    input.groupCategories = this.normalizeCategories(input.groupCategories);
    if (input.groupImage)
      input.groupImage = this.sanitizeImagePath(input.groupImage);

    try {
      const created = await this.groupModel.create({
        ...input,
        memberCount: 1,
      });

      // Ensure creator is a member of the group
      await this.groupMemberModel.create({
        groupId: created._id,
        memberId: input.memberId,
        groupMemberRole: GroupMemberRole.OWNER,
      });

      return created.toJSON() as unknown as Group;
    } catch (err) {
      console.log("Error, model:createGroup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async updateGroup(
    memberId: Types.ObjectId,
    input: GroupUpdateInput,
  ): Promise<Group> {
    const group = await this.groupModel.findById(input._id).exec();
    if (!group) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    if (String(group.memberId) !== String(memberId)) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const update: any = {};
    if (typeof input.groupName === "string") update.groupName = input.groupName;
    if (typeof input.groupDesc === "string") update.groupDesc = input.groupDesc;
    if (input.groupCategories !== undefined)
      update.groupCategories = this.normalizeCategories(input.groupCategories);
    if (typeof input.groupImage === "string")
      update.groupImage = this.sanitizeImagePath(input.groupImage);

    const updated = await this.groupModel
      .findByIdAndUpdate(input._id, { $set: update }, { new: true })
      .exec();

    if (!updated) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return updated.toJSON() as unknown as Group;
  }

  public async getGroups(inquiry: GroupInquiry): Promise<any[]> {
    const match: any = { groupStatus: GroupStatus.ACTIVE };
    if (inquiry.search)
      match.groupName = {
        $regex: new RegExp(escapeRegExp(inquiry.search), "i"),
      };
    if (inquiry.memberId) match.memberId = inquiry.memberId;

    const sort: any = { [inquiry.order || "createdAt"]: -1 };

    const result = await this.groupModel
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

    return result;
  }

  public async getGroup(
    memberId: Types.ObjectId | null,
    id: string,
  ): Promise<any> {
    const group = await this.groupModel.findById(id).exec();
    if (!group) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (group.groupStatus === GroupStatus.DELETE)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // View counting (only for logged-in users)
    if (memberId) {
      const newView = await this.viewService.insertMemberView({
        memberId,
        viewRefId: group._id,
        viewGroup: ViewGroup.GROUP,
      });
      if (newView) {
        await this.groupModel
          .findByIdAndUpdate(id, { $inc: { groupViews: 1 } })
          .exec();
        group.groupViews++;
      }
    }

    const groupJson = group.toJSON() as any;

    // Attach creator info
    const memberData = await this.memberModel.findById(group.memberId).exec();
    if (memberData) groupJson.memberData = memberData.toJSON();

    // Attach joined status
    if (memberId) {
      const membership = await this.groupMemberModel
        .findOne({ groupId: group._id, memberId: memberId })
        .exec();
      groupJson.meJoined = Boolean(membership);
      if (membership) {
        groupJson.groupMemberRole = (
          membership.toJSON() as any
        ).groupMemberRole;
        groupJson.joinDate = (membership.toJSON() as any).joinDate;
      }
    } else {
      groupJson.meJoined = false;
    }

    return groupJson;
  }

  public async joinGroup(
    memberId: Types.ObjectId,
    groupId: string,
  ): Promise<any> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (group.groupStatus === GroupStatus.DELETE)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    try {
      await this.groupMemberModel.create({
        groupId: new Types.ObjectId(groupId),
        memberId,
        groupMemberRole: GroupMemberRole.MEMBER,
      });
      await this.groupModel
        .findByIdAndUpdate(groupId, { $inc: { memberCount: 1 } })
        .exec();
      return { joined: true };
    } catch (err) {
      // Duplicate join -> treat as already joined
      return { joined: false, message: "Already joined" };
    }
  }

  public async getMyGroups(memberId: Types.ObjectId): Promise<any[]> {
    const memberships = await this.groupMemberModel
      .find({ memberId }, { groupId: 1 })
      .exec();

    const groupIds = memberships.map((m: any) => m.groupId);
    if (groupIds.length === 0) return [];

    const groups = await this.groupModel
      .find({ _id: { $in: groupIds }, groupStatus: GroupStatus.ACTIVE })
      .exec();

    return groups.map((g: any) => g.toJSON());
  }
}

export default GroupService;
