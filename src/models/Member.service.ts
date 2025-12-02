import MemberModel from "../schemas/Member.schema";
import { LoginInput, Member, MemberInput } from "../libs/types/member";
import Errors, { Message, HttpCode } from "../libs/Errors";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import * as bcrypt from "bcryptjs";
import mongoose from "mongoose";

class MemberService {
  static processSignup(newAdmin: MemberInput) {
      throw new Error("Method not implemented.");
  }
  
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
    
    try {
      const result = await this.memberModel.create(input);
      // Logic: Clear password
      result.memberPassword = "";
      return result.toJSON() as unknown as Member;
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

    const isMatch = await bcrypt.compare(input.memberPassword, member.memberPassword);
    if (!isMatch) throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);

    // FIX: Retrieve full member details
    const fullMember = await this.memberModel.findById(member._id).exec();
    if (!fullMember) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return fullMember.toJSON() as unknown as Member;
  }


  /* BSSR */
  public async processSignup(input: MemberInput): Promise<Member> {
    const exist = await this.memberModel
      .findOne({ memberType: MemberType.ADMIN })
      .exec();
    console.log("exist:", exist);
    
    if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.ADMIN_EXISTS);

    const salt: string = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = ""; 
      
      return result.toObject() as Member; 
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberNick },
        { memberNick: 1, memberPassword: 1 }
      )
      .exec();
      
    console.log("member:", member);
    
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

    return result.toObject() as Member;
  }


  /**
   * BSSR: Get All Members
   * Used by: AdminController -> to show the table in users.ejs
   */
  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: { $ne: MemberType.ADMIN } }) // Exclude Super Admin
      .exec();

    if (result.length === 0) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result as unknown as Member[];
  }

  /**
   * BSSR: Update Member Status
   * Used by: AdminController -> when Admin clicks "Approve" or "Block"
   */
  public async updateMember(input: MemberInput): Promise<Member> {
    const memberId = input._id;
    const result = await this.memberModel
      .findByIdAndUpdate(memberId, input, { new: true })
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result.toObject() as Member;
  }


}

export default MemberService;