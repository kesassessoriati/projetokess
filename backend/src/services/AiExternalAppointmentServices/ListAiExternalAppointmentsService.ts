import { Op } from "sequelize";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import Appointment from "../../models/Appointment";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import UserSchedule from "../../models/UserSchedule";

interface Request {
  companyId: number;
  pageNumber?: string | number;
  status?: string;
  leadPhone?: string;
  startDate?: string;
  endDate?: string;
}

const ListAiExternalAppointmentsService = async ({
  companyId,
  pageNumber = 1,
  status,
  leadPhone,
  startDate,
  endDate
}: Request) => {
  const limit = 50;
  const offset = limit * (Number(pageNumber) - 1);
  const where: Record<string, any> = { companyId };

  if (status) where.status = status;
  if (leadPhone) where.leadPhone = { [Op.like]: `%${leadPhone}%` };
  if (startDate && endDate) {
    where.startDatetime = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  } else if (startDate) {
    where.startDatetime = { [Op.gte]: new Date(startDate) };
  } else if (endDate) {
    where.startDatetime = { [Op.lte]: new Date(endDate) };
  }

  const { rows, count } = await AiExternalAppointment.findAndCountAll({
    where,
    distinct: true,
    include: [
      { model: Appointment, as: "appointment", required: false },
      { model: CrmLead, as: "crmLead", required: false },
      { model: Contact, as: "contact", required: false },
      { model: Pipeline, as: "pipeline", required: false },
      { model: PipelineStage, as: "stage", required: false },
      { model: UserSchedule, as: "schedule", required: false }
    ],
    limit,
    offset,
    order: [["startDatetime", "DESC"]]
  });

  return {
    appointments: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListAiExternalAppointmentsService;
