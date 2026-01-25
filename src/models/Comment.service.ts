import CommentModel from "../schemas/Comment.schema";
import BoardModel from "../schemas/Board.schema";
import EventModel from "../schemas/Event.schema";
import {
  CommentInput,
  CommentInquiry,
  Comment,
  CommentListResponse,
} from "../libs/types/comment";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { CommentStatus } from "../libs/enums/comment.enum";

class CommentService {
  private readonly commentModel;
  private readonly boardModel;
  private readonly eventModel;

  constructor() {
    this.commentModel = CommentModel;
    this.boardModel = BoardModel;
    this.eventModel = EventModel;
  }

  public async createComment(input: CommentInput): Promise<Comment> {
    // Verify that the article/event exists (try both models)
    const article = await this.boardModel.findById(input.articleId).exec();
    const event = await this.eventModel.findById(input.articleId).exec();

    if (!article && !event) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    try {
      const result = await this.commentModel.create(input);
      return result.toJSON() as unknown as Comment;
    } catch (err) {
      console.log("Error, model:createComment", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async getComments(
    inquiry: CommentInquiry,
  ): Promise<CommentListResponse> {
    const match = {
      articleId: inquiry.articleId,
      commentStatus: CommentStatus.ACTIVE,
    };
    const [result, total] = await Promise.all([
      this.commentModel
        .aggregate([
          { $match: match },
          { $sort: { createdAt: -1 } },
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
        .exec(),
      this.commentModel.countDocuments(match).exec(),
    ]);

    return {
      data: result as unknown as Comment[],
      total,
      page: inquiry.page,
      limit: inquiry.limit,
      hasMore: inquiry.page * inquiry.limit < total,
    };
  }

  public async getAllCommentsAdmin(): Promise<Comment[]> {
    const result = await this.commentModel
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
    return result as unknown as Comment[];
  }

  public async updateCommentStatus(input: any): Promise<any> {
    const commentId = input._id;
    const result = await this.commentModel
      .findByIdAndUpdate(
        commentId,
        { commentStatus: input.commentStatus },
        { new: true },
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toJSON() as unknown as any;
  }

  public async updateCommentContent(
    commentId: string,
    memberId: string,
    commentContent: string,
  ): Promise<Comment> {
    const updated = await this.commentModel
      .findOneAndUpdate(
        { _id: commentId, memberId, commentStatus: CommentStatus.ACTIVE },
        { commentContent },
        { new: true },
      )
      .exec();

    if (!updated) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return updated.toJSON() as unknown as Comment;
  }

  public async softDeleteComment(
    commentId: string,
    memberId: string,
  ): Promise<Comment> {
    const deleted = await this.commentModel
      .findOneAndUpdate(
        { _id: commentId, memberId, commentStatus: CommentStatus.ACTIVE },
        { commentStatus: CommentStatus.DELETE },
        { new: true },
      )
      .exec();

    if (!deleted) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return deleted.toJSON() as unknown as Comment;
  }
}

export default CommentService;
