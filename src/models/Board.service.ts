import BoardModel from "../schemas/Board.schema";
import { BoardInput, BoardInquiry, Board } from "../libs/types/board";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { BoardStatus } from "../libs/enums/board.enum";
import { T } from "../libs/types/common";

class BoardService {
  private readonly boardModel;

  constructor() {
    this.boardModel = BoardModel;
  }

  /**
   * Create Article
   */
  public async createBoard(input: BoardInput): Promise<Board> {
    try {
      const result = await this.boardModel.create(input);
      return result.toJSON() as unknown as Board;
    } catch (err) {
      console.log("Error, model:createBoard", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /**
   * Get Single Article
   * (Logic: We will add View Counting here later)
   */
  public async getBoard(id: string): Promise<Board> {
    const board = await this.boardModel.findById(id).exec();
    if (!board) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    
    return board.toJSON() as unknown as Board;
  }

  /**
   * Get All Articles (Feed)
   */
  public async getBoards(inquiry: BoardInquiry): Promise<Board[]> {
    const match: T = { boardStatus: BoardStatus.ACTIVE };

    // Search Logic
    if (inquiry.search) {
      match.boardTitle = { $regex: new RegExp(inquiry.search, "i") };
    }
    
    // Filter by Author
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
        // JOIN: Get Author Details
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
}

export default BoardService;