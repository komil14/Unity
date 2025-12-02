import CommentModel from "../schemas/Comment.schema";
import BoardModel from "../schemas/Board.schema";
import { CommentInput, CommentInquiry, Comment } from "../libs/types/comment";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { CommentStatus } from "../libs/enums/comment.enum";

class CommentService {
  private readonly commentModel;
  private readonly boardModel;

  constructor() {
    this.commentModel = CommentModel;
    this.boardModel = BoardModel;
  }

  public async createComment(input: CommentInput): Promise<Comment> {
    const article = await this.boardModel.findById(input.articleId).exec();
    if (!article) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    try {
      const result = await this.commentModel.create(input);
      return result.toJSON() as unknown as Comment;
    } catch (err) {
      console.log("Error, model:createComment", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getComments(inquiry: CommentInquiry): Promise<Comment[]> {
    const match = { articleId: inquiry.articleId, commentStatus: CommentStatus.ACTIVE };
    const result = await this.commentModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: 1 } },
        { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
        { $limit: inquiry.limit * 1 },
        { $lookup: { from: "members", localField: "memberId", foreignField: "_id", as: "memberData" } },
        { $unwind: "$memberData" },
      ])
      .exec();
    return result as unknown as Comment[];
  }

  /** BSSR: Get All Comments */
  public async getAllCommentsAdmin(): Promise<Comment[]> {
    const result = await this.commentModel
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "members", localField: "memberId", foreignField: "_id", as: "memberData" } },
        { $unwind: "$memberData" },
      ])
      .exec();
    return result as unknown as Comment[];
  }

  /** BSSR: Update Comment Status */
  public async updateCommentStatus(input: any): Promise<Comment> {
    const result = await this.commentModel
      .findByIdAndUpdate(input._id, { commentStatus: input.commentStatus }, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toJSON() as unknown as Comment;
  }
}

export default CommentService;