import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import ScheduledDispatcher from "../../models/ScheduledDispatcher";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

interface Request {
  dispatcherId: number;
  companyId: number;
}

const DeleteScheduledDispatcherService = async ({
  dispatcherId,
  companyId
}: Request): Promise<void> => {
  const dispatcher = await ScheduledDispatcher.findOne({
    where: { id: dispatcherId, companyId }
  });

  if (!dispatcher) {
    throw new AppError("Scheduled dispatcher not found", 404);
  }

  // Remove media file from disk if present
  if (dispatcher.mediaUrl) {
    const filePath = path.resolve(publicFolder, dispatcher.mediaUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await dispatcher.destroy();
};

export default DeleteScheduledDispatcherService;
