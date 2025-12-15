import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import EventModel from "../schemas/Event.schema";

dotenv.config();

/**
 * Script to fix image paths in the database
 * Removes absolute paths and keeps only filenames
 */
async function fixImagePaths() {
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
    console.log("Connected to MongoDB");

    // Fix Events
    const events = await EventModel.find({}).exec();
    let fixedCount = 0;

    for (const event of events) {
      let needsUpdate = false;
      const fixedImages = event.eventImages.map((img: string) => {
        // If image contains path separators, extract just the filename
        if (img.includes("/") || img.includes("\\")) {
          needsUpdate = true;
          return path.basename(img);
        }
        return img;
      });

      if (needsUpdate) {
        event.eventImages = fixedImages;
        await event.save();
        fixedCount++;
        console.log(`Fixed event: ${event._id} - ${event.eventTitle}`);
      }
    }

    console.log(
      `\n✅ Fixed ${fixedCount} events out of ${events.length} total`
    );

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.error("Error fixing image paths:", err);
    process.exit(1);
  }
}

fixImagePaths();
