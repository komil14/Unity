import { Response } from "express";
import { T } from "../libs/types/common";
import LikeService from "../models/Like.service";
import { AdminRequest } from "../libs/types/member";
import { LikeInput } from "../libs/types/like";
import Errors, { HttpCode, Message } from "../libs/Errors";

const likeService = new LikeService();
const likeController: T = {};

/** POST: Toggle Like */
likeController.toggleLike = async (req: AdminRequest, res: Response) => {
  try {
    console.log("Toggle Like Body:", req.body);
    const input: LikeInput = req.body;
    
    // Inject User ID
    input.memberId = req.member._id;

    const result = await likeService.toggleLike(input);
    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, toggleLike:", err);
    if (err instanceof Errors) res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET: Check if Liked */
likeController.checkLikeExistence = async (req: AdminRequest, res: Response) => {
  try {
    const input: LikeInput = req.body; // Can also use query params if preferred
    input.memberId = req.member._id;

    const result = await likeService.checkLikeExistence(input);
    res.status(200).json({ exist: result });
  } catch (err: any) {
    console.log("Error, checkLikeExistence:", err);
    res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
}

export default likeController;