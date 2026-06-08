import { Op } from "sequelize";
import AiExternalFollowUpLog, { FollowUpLogStatus } from "../../models/AiExternalFollowUpLog";

export const listFollowUpLogs = async ({
  companyId,
  status,
  pageNumber = 1,
  limit = 50
}: {
  companyId: number;
  status?: FollowUpLogStatus;
  pageNumber?: number | string;
  limit?: number;
}) => {
  const offset = limit * (Number(pageNumber) - 1);
  const where: any = { companyId };
  if (status) where.status = status;

  const { rows, count } = await AiExternalFollowUpLog.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  return { logs: rows, count, hasMore: count > offset + rows.length };
};
