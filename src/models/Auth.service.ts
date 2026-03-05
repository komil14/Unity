import Errors, { HttpCode, Message } from "../libs/Errors"; // Note: Capital 'E' if your file is Errors.ts
import { AUTH_TIMER } from "../libs/config";
import { Member } from "../libs/types/member";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import MemberModel from "../schemas/Member.schema";

class AuthService {
  private readonly secretToken;
  constructor() {
    this.secretToken = process.env.TOKEN_SECRET as string;
  }

  public async createToken(payload: Member) {
    return new Promise((resolve, reject) => {
      const duration = `${AUTH_TIMER}h`;
      jwt.sign(
        payload,
        this.secretToken,
        { expiresIn: duration },
        (err, token) => {
          if (err) {
            reject(
              new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_CREATION_FAILED),
            );
          } else {
            resolve(token as string);
          }
        },
      );
    });
  }

  public async checkAuth(token: string): Promise<Member> {
    // Verify the JWT token for security
    const tokenPayload: Member = (await jwt.verify(
      token,
      this.secretToken,
    )) as Member;
    console.log(
      "AuthService - checkAuth token verified for member:",
      tokenPayload._id,
    );

    // CRITICAL: Fetch fresh member data from database to get current memberStatus
    // This ensures that if admin changed status (PENDING → ACTIVE), user gets updated data
    const memberId = new Types.ObjectId(tokenPayload._id as unknown as string);
    const freshMember = await MemberModel.findById(memberId).exec();

    if (!freshMember) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    console.log("AuthService - checkAuth returning fresh member data:", {
      _id: freshMember._id,
      memberStatus: freshMember.memberStatus,
    });

    return freshMember.toJSON() as Member;
  }
}

export default AuthService;
