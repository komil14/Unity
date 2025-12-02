import { Request, Response } from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import AuthService from "../models/Auth.service"; // Import the new Service
import { MemberInput, LoginInput } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";

// Instantiate Services
const memberService = new MemberService();
const authService = new AuthService(); // Instantiate Auth Service

const memberController: T = {};

/** SPA: Signup */
memberController.signup = async (req: Request, res: Response) => {
  try {
    console.log("Signup Body:", req.body);
    const input: MemberInput = req.body;

    if (
      input.memberType !== MemberType.USER &&
      input.memberType !== MemberType.ORG
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    const result = await memberService.signup(input);

    // USE AUTH SERVICE
    const token = await authService.createToken(result);

    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(201).json({ member: result, accessToken: token });
  } catch (err: any) {
    console.log("Error, signup:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

/** SPA: Login */
memberController.login = async (req: Request, res: Response) => {
  try {
    console.log("Login Body:", req.body);
    const input: LoginInput = req.body;

    const result = await memberService.login(input);

    // USE AUTH SERVICE
    const token = await authService.createToken(result);

    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(200).json({ member: result, accessToken: token });
  } catch (err: any) {
    console.log("Error, login:", err);
    if (err instanceof Errors)
      res.status(err.code).json({ message: err.message });
    else res.status(500).json({ message: Message.SOMETHING_WENT_WRONG });
  }
};

export default memberController;
