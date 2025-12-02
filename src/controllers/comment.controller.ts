import { Response } from "express";
import { T } from "../libs/types/common";
import CommentService from "../models/Comment.service";
import { AdminRequest } from "../libs/types/member";
import { CommentInput, CommentInquiry } from "../libs/types/comment";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Types } from "mongoose";

const commentService = new CommentService();
const commentController: T = {};

/** POST: Create Comment */
commentController.createComment = async (req: AdminRequest, res: Response) => {
  try {
    console.log("CreateComment Body:", req.body);
    const input: CommentInput = req.body;
    
    // Inject Member ID
    input.memberId = req.member._id;

    const result = await commentService.createComment(input);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, createComment:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: List Comments for an Article */
commentController.getComments = async (req: any, res: Response) => {
  try {
    // We expect ?articleId=... in the URL
    const { articleId, page, limit } = req.query;
    
    if (!articleId) throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);

    const inquiry: CommentInquiry = {
        articleId: new Types.ObjectId(String(articleId)),
        page: Number(page) || 1,
        limit: Number(limit) || 10
    };

    const result = await commentService.getComments(inquiry);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getComments:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default commentController;