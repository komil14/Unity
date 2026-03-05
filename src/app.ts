import express from "express";
import path from "path";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import ConnectMongoDB from "connect-mongodb-session";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import routerAdmin from "./router-admin";
import router from "./router";
import { T } from "./libs/types/common"; // Import T

const MongoDBStore = ConnectMongoDB(session);

const app = express();

/** 0. SECURITY HEADERS **/
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for EJS admin views
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

/** 1. MIDDLEWARE **/
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../..", "uploads"), {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    credentials: true,
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://localhost:5173"],
  }),
);
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms"),
);
app.use(cookieParser());

/** 1.5 RATE LIMITING **/
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login/signup attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

app.use("/api", globalLimiter);
app.use("/api/member/login", authLimiter);
app.use("/api/member/signup", authLimiter);
app.use("/admin/login", authLimiter);

/** 2. SESSIONS **/
const store = new MongoDBStore({
  uri: process.env.MONGO_URL as string,
  collection: "sessions",
});

store.on("error", (error: Error) => {
  console.error("Session store error:", error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    store: store,
    resave: false,
    saveUninitialized: false,
  }),
);

/** 3. GLOBAL VARIABLES (Your Code) **/
// This middleware runs on EVERY request
app.use(function (req, res, next) {
  const sessionInstance = req.session as T; // Type assertion
  res.locals.member = sessionInstance.member; // Now available in all EJS files
  next();
});

/** 4. VIEWS **/
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

/** 5. ROUTERS **/
app.use("/admin", routerAdmin);
app.use("/api", router);

/** 6. GLOBAL ERROR HANDLER **/
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    const statusCode = err.status || err.code || 500;
    const message = err.message || "Something went wrong!";
    if (!res.headersSent) {
      res
        .status(
          typeof statusCode === "number" &&
            statusCode >= 100 &&
            statusCode < 600
            ? statusCode
            : 500,
        )
        .json({ message });
    }
  },
);

export default app;
