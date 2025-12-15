import MemberModel from "../schemas/Member.schema";
import { LoginInput, Member, MemberInput } from "../libs/types/member";
import Errors, { Message, HttpCode } from "../libs/Errors";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import * as bcrypt from "bcryptjs";
import { Types } from "mongoose";

class MemberService {
  private readonly memberModel;

  constructor() {
    this.memberModel = MemberModel;
  }

  /**
   * SPA: Signup (For Users and Organizations)
   */
  public async signup(input: MemberInput): Promise<Member> {
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    // Set status based on type: USER is ACTIVE, ORG is PENDING
    if (input.memberType === MemberType.ORG) {
      input.memberStatus = MemberStatus.PENDING;
    } else if (input.memberType === MemberType.USER) {
      input.memberStatus = MemberStatus.ACTIVE;
    }

    try {
      const result = await this.memberModel.create(input);
      const resultJson = result.toJSON();
      delete (resultJson as any).memberPassword;

      return resultJson as unknown as Member;
    } catch (err) {
      console.log("Error, model:signup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /**
   * SPA: Login
   */
  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 }
      )
      .exec();

    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);

    const fullMember = await this.memberModel.findById(member._id).exec();
    if (!fullMember)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const resultJson = fullMember.toJSON();
    delete (resultJson as any).memberPassword;
    return resultJson as unknown as Member;
  }

  /* BSSR: Admin Signup */
  public async processSignup(input: MemberInput): Promise<Member> {
    const exist = await this.memberModel
      .findOne({ memberType: MemberType.ADMIN })
      .exec();

    if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);

    const salt: string = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);
    input.memberStatus = MemberStatus.ACTIVE; // Admin is always active

    try {
      const result = await this.memberModel.create(input);

      const resultJson = result.toJSON();
      delete (resultJson as any).memberPassword;

      return resultJson as unknown as Member;
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  /* BSSR: Admin Login */
  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1, memberType: 1, memberStatus: 1 }
      )
      .exec();

    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );

    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
    }

    const result = await this.memberModel.findById(member._id).exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result.toJSON() as unknown as Member;
  }

  /** BSSR: Get All Users (Table) */
  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: { $ne: MemberType.ADMIN } })
      .exec();

    if (!result || result.length === 0) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    return result as unknown as Member[];
  }
  /** BSSR: Update Status (ROBUST FIX) */
  public async updateMember(input: MemberInput): Promise<Member> {
    // Explicitly convert string ID to ObjectId to ensure MongoDB finds the doc
    const memberId = new Types.ObjectId(input._id as unknown as string);

    // Get the member to check type
    const member = await this.memberModel.findById(memberId).exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    // Set/remove verification badge based on org status
    const updateData: any = { memberStatus: input.memberStatus };
    if (member.memberType === MemberType.ORG) {
      if (input.memberStatus === MemberStatus.ACTIVE) {
        updateData.isVerified = true;
      } else if (
        input.memberStatus === MemberStatus.PENDING ||
        input.memberStatus === MemberStatus.BLOCK
      ) {
        updateData.isVerified = false;
      }
    }

    const result = await this.memberModel
      .findOneAndUpdate({ _id: memberId }, { $set: updateData }, { new: true })
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result.toJSON() as unknown as Member;
  }

  /** BSSR: Get Stats */
  public async getMemberStats(): Promise<any> {
    const total = await this.memberModel.countDocuments();
    const active = await this.memberModel.countDocuments({
      memberStatus: MemberStatus.ACTIVE,
    });
    const blocked = await this.memberModel.countDocuments({
      memberStatus: MemberStatus.BLOCK,
    });
    const pending = await this.memberModel.countDocuments({
      memberStatus: MemberStatus.PENDING,
    });

    // Count New Users (Last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newUsers = await this.memberModel.countDocuments({
      memberType: MemberType.USER,
      createdAt: { $gte: last24h },
    });

    return { total, active, blocked, pending, newUsers };
  }
}

export default MemberService;
