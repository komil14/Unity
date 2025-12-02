import { T } from "../libs/types/common";
import { Request, Response } from "express";
import { AdminRequest, LoginInput, MemberInput } from "../libs/types/member";
import Errors, { Message } from "../libs/Errors";
import { MemberType } from "../libs/enums/member.enum";
import MemberService from "../models/Member.service";

const memberService = new MemberService();

const adminController: T = {};

/* GET: Dashboard Protected Route */
adminController.goHome = (req: AdminRequest, res: Response) => {
  try {
    if (!req.session?.member) {
      res.redirect("/admin/login");
    } else {
      res.render("home", { user: req.session.member });
    }
  } catch (err) {
    console.log("Error: goHome", err);
    res.redirect("/admin/login");
  }
};

/* GET: Signup Page */
adminController.getSignup = (req: Request, res: Response) => {
  try {
    res.render("signup");
  } catch (err) {
    console.log("Error: getSignup", err);
    res.redirect("/admin");
  }
};

/* GET: Login Page */
adminController.getLogin = (req: Request, res: Response) => {
  try {
    res.render("login");
  } catch (err) {
    console.log("Error: getLogin", err);
    res.redirect("/admin");
  }
};

/* POST: Process Signup */
adminController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    const newAdmin: MemberInput = req.body;
    newAdmin.memberType = MemberType.ADMIN;

    const result = await memberService.processSignup(newAdmin);
    result.memberPassword = "";

    res.send(
      `<script>
        alert("Signup Successful! Please login.");
        window.location.replace('/admin/login');
      </script>`
    );
  } catch (err) {
    console.log("Error: processSignup", err);
    const message = err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script>
        alert("${message}");
        window.location.replace('/admin/signup');
      </script>`
    );
  }
};

/* POST: Process Login */
adminController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    const input: LoginInput = req.body;
    const result = await memberService.processLogin(input);

    req.session.member = result;

    req.session.save((err) => {
      if (err) {
        console.log("Session save error:", err);
        return res.send(
          `<script>
            alert("Session error, please login again!");
            window.location.replace('/admin/login');
          </script>`
        );
      }

      res.send(
        `<script>
          alert("Login Successful!");
          window.location.replace("/admin");
        </script>`
      );
    });
  } catch (err) {
    console.log("Error: processLogin", err);
    const message = err instanceof Error ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script>
        alert("${message}");
        window.location.replace('/admin/login');
      </script>`
    );
  }
};

/* GET: Logout */
adminController.logout = (req: Request, res: Response) => {
  try {
    req.session.destroy(() => {
      res.redirect("/admin/login");
    });
  } catch (err) {
    console.log("Error: logout", err);
    res.redirect("/admin");
  }
};

/* GET: Users Management Page */
adminController.getUsers = async (req: Request, res: Response) => {
  try {
    const users = await memberService.getUsers();
    res.status(200).json({ data: users });
  } catch (err) {
    console.log("Error: getUsers", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/* POST: Update Member Status */
adminController.updateMember = async (req: Request, res: Response) => {
  try {
    const input: MemberInput = req.body;
    const result = await memberService.updateMember(input);
    res.json({ state: "success", data: result });
  } catch (err) {
    console.log("Error: updateMember", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/* GET: Check Auth Session */
adminController.checkAuthSession = (req: AdminRequest, res: Response) => {
  try {
    if (req.session?.member)
      res.send(
        `<script> alert("HI: ${req.session.member.memberNick}")</script>`
      );
    else
      res.send(
        `<script> alert("${Message.NOT_AUTHENTICATED}")</script>`
      );
  } catch (err) {
    console.log("Error: checkAuthSession", err);
    res.send(err);
  }
};

/* Middleware: Verify Admin */
adminController.verifyAdmin = (req: AdminRequest, res: Response, next: Function) => {
  try {
    if (req.session?.member && req.session.member.memberType === MemberType.ADMIN) {
      next();
    } else {
      res.send(
        `<script>
          alert("${Message.NOT_AUTHENTICATED}");
          window.location.replace('/admin/login');
        </script>`
      );
    }
  } catch (err) {
    console.log("Error: verifyAdmin", err);
    res.send(
      `<script>
        alert("${Message.SOMETHING_WENT_WRONG}");
        window.location.replace('/admin/login');
      </script>`
    );
  }
};

export default adminController;