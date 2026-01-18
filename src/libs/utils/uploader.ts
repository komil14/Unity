import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

/**
 * Configure Multer Storage
 * @param folderName - The subfolder inside 'uploads' (e.g., 'events', 'members')
 */
function getTargetImageStorage(folderName: string) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      // Define where the file goes: Unity/uploads/{folderName} (outside backend folder)
      const uploadPath = path.join(
        __dirname,
        "../../../../uploads",
        folderName
      );
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Generate a unique name: UUID + Original Extension (e.g., .jpg)
      const extension = path.parse(file.originalname).ext;
      const randomName = uuidv4() + extension;
      cb(null, randomName);
    },
  });
}

/**
 * Factory function to create a configured uploader middleware
 * Usage: makeUploader("events").single("eventImage")
 */
const makeUploader = (address: string) => {
  const storage = getTargetImageStorage(address);
  return multer({ storage: storage });
};

export default makeUploader;
