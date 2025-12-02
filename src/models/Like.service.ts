import LikeModel from "../schemas/Like.schema";
import MemberModel from "../schemas/Member.schema";
import EventModel from "../schemas/Event.schema";
import BoardModel from "../schemas/Board.schema";
import CommentModel from "../schemas/Comment.schema";
import { LikeInput, Like } from "../libs/types/like";
import { LikeGroup } from "../libs/enums/like.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";

class LikeService {
  private readonly likeModel;
  private readonly memberModel;
  private readonly eventModel;
  private readonly boardModel;
  private readonly commentModel;

  constructor() {
    this.likeModel = LikeModel;
    this.memberModel = MemberModel;
    this.eventModel = EventModel;
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
      .findOne({ memberId: memberId, likeRefId: likeRefId, likeGroup: likeGroup })
      .exec();
    return !!exist;
  }

  /**
   * Helper: Selects the right Model and Field based on the Group
   */
  private async modifyTargetLikeCount(input: LikeInput, modifier: number) {
    const { likeGroup, likeRefId } = input;

    switch (likeGroup) {
      case LikeGroup.MEMBER:
        return await this.memberModel
          .findByIdAndUpdate(likeRefId, { $inc: { memberLikes: modifier } })
          .exec();
      
      case LikeGroup.EVENT:
        return await this.eventModel
          .findByIdAndUpdate(likeRefId, { $inc: { eventLikes: modifier } })
          .exec();

      case LikeGroup.ARTICLE:
        return await this.boardModel
          .findByIdAndUpdate(likeRefId, { $inc: { boardLikes: modifier } })
          .exec();

      case LikeGroup.COMMENT:
        return await this.commentModel
          .findByIdAndUpdate(likeRefId, { $inc: { commentLikes: modifier } })
          .exec();
    }
  }
}

export default LikeService;