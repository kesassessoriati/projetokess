import AiExternalAgentEvent from "../../models/AiExternalAgentEvent";

interface Request {
  companyId: number;
  pageNumber?: string | number;
  status?: string;
  eventType?: string;
}

const ListExternalAgentEventsService = async ({
  companyId,
  pageNumber = 1,
  status,
  eventType
}: Request) => {
  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);
  const where: Record<string, any> = { companyId };

  if (status) where.status = status;
  if (eventType) where.eventType = eventType;

  const { count, rows } = await AiExternalAgentEvent.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  return {
    events: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListExternalAgentEventsService;
