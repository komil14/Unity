import Errors, { HttpCode, Message } from "../libs/Errors"; // Note: Capital 'E' if your file is Errors.ts
import { AUTH_TIMER } from "../libs/config";
import { Member } from "../libs/types/member";
import jwt from "jsonwebtoken";

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
              new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_CREATION_FAILED)
            );
          } else {
            resolve(token as string);
          }
        }
      );
    });
  }

  public async checkAuth(token: string): Promise<Member> {
    const result: Member = (await jwt.verify(
      token,
      this.secretToken
    )) as Member;
    console.log("AuthService - checkAuth result:", result);
    return result;
  }
}

export default AuthService;
