import { Request, Response } from "express";
import path from "path";
import { T } from "../libs/types/common";
import BoardService from "../models/Board.service"; // <-- Correct import of BoardService
import { BoardInput, BoardInquiry } from "../libs/types/board";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { AdminRequest } from "../libs/types/member";
import { Types } from "mongoose";

// Instantiate the Service. TypeScript should correctly infer BoardService type here.
const boardService = new BoardService();
const boardController: T = {};

/**
 * POST /board/create
 * Requires: Auth, Image (Multer)
 */
boardController.createBoard = async (req: AdminRequest, res: Response) => {
  try {
    console.log("CreateBoard Body:", req.body);
    const input: BoardInput = req.body;

    // Handle Image - store only filename so views can reference `/uploads/community/<filename>`
    if (req.file) {
      const filename =
        (req.file as any).filename ||
        path.basename((req.file as any).path || "");
      input.boardImage = filename;
    }

    // Inject Author
    input.memberId = req.member._id;

    // USAGE: Calls createBoard on the instantiated boardService
    const result = await boardService.createBoard(input);

    res.status(201).json(result);
  } catch (err: any) {
    console.log("Error, createBoard:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/**
 * GET /board/all
 */
boardController.getBoards = async (req: Request, res: Response) => {
  try {
    const inquiry: BoardInquiry = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 5,
      order: req.query.order ? String(req.query.order) : "createdAt",
      search: req.query.search ? String(req.query.search) : undefined,
    };

    // USAGE: Calls getBoards on the instantiated boardService
    const result = await boardService.getBoards(inquiry);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getBoards:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** GET /board/:id */
boardController.getBoard = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const memberId = req.member?._id ?? null;

    // USAGE: Calls getBoard on the instantiated boardService
    const result = await boardService.getBoard(memberId, id);
    res.status(200).json(result);
  } catch (err: any) {
    console.log("Error, getBoard:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default boardController;
