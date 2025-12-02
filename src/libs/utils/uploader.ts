import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

/**
 * Root location for all uploads
 */
function getTargetImageStorage(folderName: string) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      // Define where the file goes: src/public/uploads/{folderName}
      const uploadPath = path.join(__dirname, "../../public/uploads", folderName);
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
 * Creates a configured Multer instance for a specific folder
 * @param address - The folder name inside /uploads (e.g., "members", "events")
 */
const makeUploader = (address: string) => {
  const storage = getTargetImageStorage(address);
  return multer({ storage: storage });
};

export default makeUploader;