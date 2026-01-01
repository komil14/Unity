import { Request, Response } from "express";
import path from "path";
import { Types } from "mongoose";

import { T } from "../libs/types/common";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { AdminRequest } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";

import GroupService from "../models/Group.service";
import {
  GroupInquiry,
  GroupInput,
  GroupUpdateInput,
} from "../libs/types/group";

const groupService = new GroupService();
const groupController: T = {};

/** POST: Create Group */
groupController.createGroup = async (req: AdminRequest, res: Response) => {
  try {
    if (req.member.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const input: GroupInput = req.body;

    if (req.file) {
      const filename =
        (req.file as any).filename ||
        path.basename((req.file as any).path || "");
      input.groupImage = filename;
    }

    input.memberId = req.member._id;

    const result = await groupService.createGroup(input);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, createGroup:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** POST: Update Group */
groupController.updateGroup = async (req: AdminRequest, res: Response) => {
  try {
    if (req.member.memberType !== MemberType.ORG) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const input: GroupUpdateInput = req.body;

    if (req.file) {
      const filename =
        (req.file as any).filename ||
        path.basename((req.file as any).path || "");
      input.groupImage = filename;
    }

    const result = await groupService.updateGroup(req.member._id, input);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, updateGroup:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: All Groups */
groupController.getGroups = async (req: Request, res: Response) => {
  try {
    const inquiry: GroupInquiry = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      order: req.query.order ? String(req.query.order) : "createdAt",
      search: req.query.search ? String(req.query.search) : undefined,
      memberId: req.query.memberId
        ? new Types.ObjectId(String(req.query.memberId))
        : undefined,
    };

    const result = await groupService.getGroups(inquiry);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getGroups:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: Group Detail (With View Counting + meJoined) */
groupController.getGroup = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const memberId = req.member?._id ?? null;

    const result = await groupService.getGroup(memberId, id);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getGroup:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** POST: Join Group */
groupController.joinGroup = async (req: AdminRequest, res: Response) => {
  try {
    const { groupId } = req.body as { groupId?: string };
    if (!groupId) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);

    const result = await groupService.joinGroup(req.member._id, groupId);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, joinGroup:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: My Groups */
groupController.getMyGroups = async (req: AdminRequest, res: Response) => {
  try {
    const result = await groupService.getMyGroups(req.member._id);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getMyGroups:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default groupController;
