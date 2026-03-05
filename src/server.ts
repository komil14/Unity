import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app";

// Validate required environment variables
const requiredEnvVars = ["MONGO_URL", "TOKEN_SECRET", "SESSION_SECRET"];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(", ")}`,
  );
  console.error("Create a .env file based on .env.example");
  process.exit(1);
}

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URL as string)
  .then(() => {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 3008;
    app.listen(PORT, function () {
      console.log(`The server is running successfully on port: ${PORT}`);
      console.log(`Admin is working on http://localhost:${PORT}/admin \n`);
    });
  })
  .catch((err) => {
    console.log("ERROR on connection on MongoDB", err);
  });
