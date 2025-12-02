import { T } from "../libs/types/common";
import { NextFunction, Request, Response } from "express";
import { AdminRequest, MemberInput, Member } from "../libs/types/member";
import { Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";
import MemberService from "../models/Member.service";

// 1. Instantiate the Service
const memberService = new MemberService(); 

const adminController: T = {};

adminController.goHome = (req: Request, res: Response) => {
  try {
    res.render("home");
  } catch (err) {
    console.log("Error: goHome", err);
    res.redirect("/admin");
  }
};

adminController.getSignup = (req: Request, res: Response) => {
  try {
    res.render("signup");
  } catch (err) {
    console.log("Error:getSignup", err);
    res.redirect("/admin");
  }
};

adminController.getLogin = (req: Request, res: Response) => {
  try {
    res.render("login");
  } catch (err) {
    console.log("Error: getLogin", err);
    res.redirect("/admin");
  }
};

adminController.processSignup = async(req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessSignup");
    console.log("Body:", req.body); // Check if data is coming now

    const newAdmin: MemberInput = req.body;
    newAdmin.memberType = MemberType.ADMIN;

    // 2. Use the instance 'memberService', not the class 'MemberService'
    const result = await memberService.processSignup(newAdmin); 

    console.log("Signup Success:", result);
    res.send(
      `<script> alert("Signup Successful! Please login."); window.location.replace('/admin/login')</script>`
    );  

  } catch (err) {
    console.log("Error: processSignup", err);
    const message =
      err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/signup')</script>`
    );
  }
};

adminController.processLogin = async(req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessLogin");
    console.log("Body:", req.body); // Check if data is coming now

    const loginInput = req.body;

    // 2. Use the instance 'memberService', not the class 'MemberService'
    const result = await memberService.processLogin(loginInput); 

    console.log("Login Success:", result);
    // Set session or cookie as needed
    res.send(
      `<script> alert("Login Successful!"); window.location.replace('/admin')</script>`
    );
    } catch (err) {
    console.log("Error: processSignup", err);
    const message =
      err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/signup')</script>`
    );
  }
};

export default adminController;