import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
        folderName,
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
 * File filter to only accept images
 */
function imageFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only images are allowed.`,
      ),
    );
  }
}

/**
 * Factory function to create a configured uploader middleware
 * Usage: makeUploader("events").single("eventImage")
 */
const makeUploader = (address: string) => {
  const storage = getTargetImageStorage(address);
  return multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });
};

export default makeUploader;
