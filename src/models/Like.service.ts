import LikeModel from "../schemas/Like.schema";
import MemberModel from "../schemas/Member.schema";
import EventModel from "../schemas/Event.schema";
import BoardModel from "../schemas/Board.schema";
import CommentModel from "../schemas/Comment.schema";
import GroupModel from "../schemas/Group.schema";
import { LikeBatchInput, LikeInput, Like } from "../libs/types/like";
import { LikeGroup } from "../libs/enums/like.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Types } from "mongoose";

class LikeService {
  private readonly likeModel;
  private readonly memberModel;
  private readonly eventModel;
  private readonly groupModel;
  private readonly boardModel;
  private readonly commentModel;

  constructor() {
    this.likeModel = LikeModel;
    this.memberModel = MemberModel;
    this.eventModel = EventModel;
    this.groupModel = GroupModel;
    this.boardModel = BoardModel;
    this.commentModel = CommentModel;
  }

  public async toggleLike(input: LikeInput): Promise<any> {
    // 1. Search Logic: Did I already like this?
    const search = {
      memberId: input.memberId,
      likeRefId: input.likeRefId,
      likeGroup: input.likeGroup,
    };

    const exist = await this.likeModel.findOne(search).exec();

    // 2. Define Modifier: +1 (Like) or -1 (Unlike)
    const modifier = exist ? -1 : 1;

    // 3. Update the Target Document (Increment/Decrement count)
    const result = await this.modifyTargetLikeCount(input, modifier);

    // 4. Update Like Collection
    if (exist) {
      await this.likeModel.findOneAndDelete(search).exec();
      return { status: "unliked", data: result };
    } else {
      const newLike = await this.likeModel.create(input);
      return { status: "liked", data: newLike };
    }
  }

  public async checkLikeExistence(input: LikeInput): Promise<boolean> {
    const { memberId, likeRefId, likeGroup } = input;
    const exist = await this.likeModel
      .findOne({
        memberId: memberId,
        likeRefId: likeRefId,
        likeGroup: likeGroup,
      })
      .exec();
    return !!exist;
  }

  public async checkLikesExistenceBatch(
    input: LikeBatchInput,
  ): Promise<string[]> {
    const { memberId, likeGroup, likeRefIds } = input;
    if (!memberId) return [];
    if (!Array.isArray(likeRefIds) || likeRefIds.length === 0) return [];

    const ids = likeRefIds
      .filter(Boolean)
      .map((id: any) => {
        try {
          return id instanceof Types.ObjectId
            ? id
            : new Types.ObjectId(String(id));
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Types.ObjectId[];

    if (ids.length === 0) return [];

    const likes = await this.likeModel
      .find({ memberId, likeGroup, likeRefId: { $in: ids } })
      .select({ likeRefId: 1, _id: 0 })
      .lean()
      .exec();

    return likes.map((l: any) => String(l.likeRefId));
  }

  /**
   * Helper: Selects the right Model and Field based on the Group
   * When modifier is -1 (unlike), ensures count doesn't go below 0
   */
  private async modifyTargetLikeCount(input: LikeInput, modifier: number) {
    const { likeGroup, likeRefId } = input;
    // For decrements, add floor guard to prevent negative counts
    const condition = modifier < 0 ? { _id: likeRefId } : { _id: likeRefId };
    const getUpdate = (field: string) => {
      if (modifier < 0) {
        // Only decrement if count > 0
        return [
          {
            $set: { [field]: { $max: [0, { $add: [`$${field}`, modifier] }] } },
          },
        ];
      }
      return { $inc: { [field]: modifier } };
    };

    switch (likeGroup) {
      case LikeGroup.MEMBER:
        return modifier < 0
          ? await this.memberModel
              .updateOne(condition, getUpdate("memberLikes") as any)
              .exec()
          : await this.memberModel
              .findByIdAndUpdate(likeRefId, getUpdate("memberLikes"))
              .exec();

      case LikeGroup.EVENT:
        return modifier < 0
          ? await this.eventModel
              .updateOne(condition, getUpdate("eventLikes") as any)
              .exec()
          : await this.eventModel
              .findByIdAndUpdate(likeRefId, getUpdate("eventLikes"))
              .exec();

      case LikeGroup.GROUP:
        return modifier < 0
          ? await this.groupModel
              .updateOne(condition, getUpdate("groupLikes") as any)
              .exec()
          : await this.groupModel
              .findByIdAndUpdate(likeRefId, getUpdate("groupLikes"))
              .exec();

      case LikeGroup.ARTICLE:
        return modifier < 0
          ? await this.boardModel
              .updateOne(condition, getUpdate("boardLikes") as any)
              .exec()
          : await this.boardModel
              .findByIdAndUpdate(likeRefId, getUpdate("boardLikes"))
              .exec();

      case LikeGroup.COMMENT:
        return modifier < 0
          ? await this.commentModel
              .updateOne(condition, getUpdate("commentLikes") as any)
              .exec()
          : await this.commentModel
              .findByIdAndUpdate(likeRefId, getUpdate("commentLikes"))
              .exec();
    }
  }
}

export default LikeService;
