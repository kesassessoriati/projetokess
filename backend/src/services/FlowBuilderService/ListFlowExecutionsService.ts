import FlowExecution from "../../models/FlowExecution";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";

interface ListFlowExecutionsParams {
  companyId: number;
  flowId?: number;
  status?: string;
  trigger?: string;
  pageNumber?: string | number;
}

const ListFlowExecutionsService = async ({
  companyId,
  flowId,
  status,
  trigger,
  pageNumber = "1"
}: ListFlowExecutionsParams) => {
  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);

  const where: any = { companyId };

  if (flowId) where.flowId = flowId;
  if (status) where.status = status;
  if (trigger) where.trigger = trigger;

  const { count, rows } = await FlowExecution.findAndCountAll({
    where,
    include: [
      {
        model: FlowBuilderModel,
        as: "flow",
        attributes: ["id", "name"]
      },
      {
        model: Ticket,
        as: "ticket",
        attributes: ["id", "status"],
        required: false
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + rows.length;

  return { executions: rows, count, hasMore };
};

export default ListFlowExecutionsService;
