import express from "express";
import path from "path";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import ConnectMongoDB from "connect-mongodb-session";
import cors from "cors";
import routerAdmin from "./router-admin";
import router from "./router";
import { T } from "./libs/types/common"; // Import T

const MongoDBStore = ConnectMongoDB(session);

const app = express();

/** 1. MIDDLEWARE **/
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ credentials: true, origin: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(cookieParser());

/** 2. SESSIONS **/
const store = new MongoDBStore({
  uri: process.env.MONGO_URL as string,
  collection: "sessions",
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "This is a secret",
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
    },
    store: store,
    resave: true,
    saveUninitialized: true,
  })
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

export default app;
