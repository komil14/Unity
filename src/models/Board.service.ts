import BoardModel from "../schemas/Board.schema";
import ViewService from "./View.service";
import { BoardInput, BoardInquiry, Board } from "../libs/types/board";
import { ViewInput } from "../libs/types/view";
import { ViewGroup } from "../libs/enums/view.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { BoardStatus } from "../libs/enums/board.enum";
import { T } from "../libs/types/common";
import { Types } from "mongoose";

class BoardService {
  private readonly boardModel;
  private readonly viewService;

  constructor() {
    this.boardModel = BoardModel;
    this.viewService = new ViewService();
  }

  public async createBoard(input: BoardInput): Promise<Board> {
    try {
      const result = await this.boardModel.create(input);
      return result.toJSON() as unknown as Board;
    } catch (err) {
      console.log("Error, model:createBoard", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getBoard(
    memberId: Types.ObjectId | null,
    id: string,
  ): Promise<Board> {
    const board = await this.boardModel.findById(id).exec();

    if (!board) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (board.boardStatus === BoardStatus.DELETE) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    if (memberId) {
      const viewInput: ViewInput = {
        memberId: memberId,
        viewRefId: board._id,
        viewGroup: ViewGroup.ARTICLE,
      };

      const newView = await this.viewService.insertMemberView(viewInput);

      if (newView) {
        await this.boardModel
          .findByIdAndUpdate(id, { $inc: { boardViews: 1 } })
          .exec();
        board.boardViews++;
      }
    }

    return board.toJSON() as unknown as Board;
  }

  public async getBoards(inquiry: BoardInquiry): Promise<Board[]> {
    const match: T = { boardStatus: BoardStatus.ACTIVE };

    if (inquiry.search) {
      match.boardTitle = { $regex: new RegExp(inquiry.search, "i") };
    }

    if (inquiry.memberId) {
      match.memberId = inquiry.memberId;
    }

    const sort: T = { [inquiry.order || "createdAt"]: -1 };

    const result = await this.boardModel
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

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result as unknown as Board[];
  }

  /** BSSR: Get All Boards (For Admin) */
  public async getAllBoardsAdmin(): Promise<Board[]> {
    const result = await this.boardModel
      .aggregate([
        { $sort: { createdAt: -1 } },
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

    return result as unknown as Board[];
  }

  /** BSSR: Update Board Status (FINAL FIX) */
  public async updateBoardStatus(input: any): Promise<any> {
    const boardId = new Types.ObjectId(input._id); // Ensure ID is a valid ObjectId type
    const result = await this.boardModel
      .findByIdAndUpdate(
        boardId,
        { $set: { boardStatus: input.boardStatus } },
        { new: true },
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toJSON() as unknown as any;
  }

  /** BSSR: Count Articles (For Admin Dashboard) */
  public async countBoards(): Promise<number> {
    return await this.boardModel.countDocuments();
  }
  /** BSSR: Get Board Stats */
  public async getBoardStats(): Promise<any> {
    const total = await this.boardModel.countDocuments();

    // Count Articles created in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newBoards = await this.boardModel.countDocuments({
      createdAt: { $gte: last24h },
    });

    return { total, newBoards };
  }

  /** Update Board (User-facing) */
  public async updateBoard(
    memberId: Types.ObjectId,
    boardId: string,
    input: Partial<BoardInput>,
  ): Promise<Board> {
    const board = await this.boardModel.findById(boardId).exec();

    if (!board) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (board.boardStatus === BoardStatus.DELETE) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    // Check ownership
    if (board.memberId.toString() !== memberId.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const result = await this.boardModel
      .findByIdAndUpdate(boardId, { $set: input }, { new: true })
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toJSON() as unknown as Board;
  }

  /** Delete Board (Soft Delete - User-facing) */
  public async deleteBoard(
    memberId: Types.ObjectId,
    boardId: string,
  ): Promise<Board> {
    const board = await this.boardModel.findById(boardId).exec();

    if (!board) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    if (board.boardStatus === BoardStatus.DELETE) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    // Check ownership
    if (board.memberId.toString() !== memberId.toString()) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const result = await this.boardModel
      .findByIdAndUpdate(
        boardId,
        { $set: { boardStatus: BoardStatus.DELETE } },
        { new: true },
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toJSON() as unknown as Board;
  }
}

export default BoardService;
