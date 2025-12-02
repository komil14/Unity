import { T } from "../libs/types/common";
import { Request, Response } from "express";
import { AdminRequest, LoginInput, MemberInput } from "../libs/types/member";
import { Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";
import MemberService from "../models/Member.service";

// Instantiate the Service
const memberService = new MemberService();

const adminController: T = {};

/** * GET: Dashboard 
 * Protected Route: Checks if session exists
 */
adminController.goHome = (req: AdminRequest, res: Response) => {
  try {
    console.log("GoHome");
    // SESSION CHECK: If no member in session, kick them to login
    if (!req.session?.member) {
        res.redirect("/admin/login");
    } else {
        // Render home and pass the logged-in user data to EJS
        res.render("home", { user: req.session.member });
    }
  } catch (err) {
    console.log("Error: goHome", err);
    res.redirect("/admin/login");
  }
};

/** GET: Signup Page */
adminController.getSignup = (req: Request, res: Response) => {
  try {
    console.log("GetSignup");
    res.render("signup");
  } catch (err) {
    console.log("Error:getSignup", err);
    res.redirect("/admin");
  }
};

/** GET: Login Page */
adminController.getLogin = (req: Request, res: Response) => {
  try {
    console.log("GetLogin");
    res.render("login");
  } catch (err) {
    console.log("Error: getLogin", err);
    res.redirect("/admin");
  }
};

/** POST: Process Signup */
adminController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessSignup");
    const newAdmin: MemberInput = req.body;
    newAdmin.memberType = MemberType.ADMIN;
    
    const result = await memberService.processSignup(newAdmin);

    console.log("Signup Success:", result);
    res.send(
      `<script> alert("Signup Successful! Please login."); window.location.replace('/admin/login')</script>`
    );

  } catch (err) {
    console.log("Error: processSignup", err);
    const message = err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/signup')</script>`
    );
  }
};

/** POST: Process Login (With Session) */
adminController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    console.log("ProcessLogin");
    console.log("Body:", req.body);

    const input: LoginInput = req.body;
    
    // 1. Call Service to Verify Password
    const result = await memberService.processLogin(input);

    // 2. SESSION: Save the member data to MongoDB Session Store
    req.session.member = result;
    
    // 3. Save & Redirect
    req.session.save(function() {
        console.log("Session Saved. Redirecting to Dashboard.");
        res.send(
            `<script> alert("Login Successful!"); window.location.replace('/admin')</script>`
        );
    });

  } catch (err) {
    console.log("Error: processLogin", err);
    const message = err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/login')</script>`
    );
  }
};

/** GET: Logout */
adminController.logout = (req: Request, res: Response) => {
  try {
    console.log("Logout");
    req.session.destroy(function() {
        res.redirect("/admin/login");
    });
  } catch (err) {
    console.log("Error: logout", err);
    res.redirect("/admin");
  }
};

adminController.logout = async (req: Request, res: Response) => {
  try {
    console.log("Logout");
    
    // Destroy the session in the database
    req.session.destroy(function(err) {
      if (err) {
        console.log("Error destroying session:", err);
      }
      // Redirect to login page after session is gone
      res.redirect("/admin/login");
    });
    
  } catch (err) {
    console.log("Error: logout", err);
    res.redirect("/admin");
  }
};




export default adminController;