import { Op } from "sequelize";
import Appointment from "../../models/Appointment";
import UserSchedule from "../../models/UserSchedule";
import User from "../../models/User";
import Servico from "../../models/Servico";
import CrmClient from "../../models/CrmClient";
import Contact from "../../models/Contact";
import GetAppointmentMetricsByUserService, {
  AppointmentUserMetric
} from "./GetAppointmentMetricsByUserService";

interface ListAppointmentsQuery {
  companyId: number;
  userId?: number;
  profile?: string;
  scheduleId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  pageNumber?: string;
  leadPhone?: string;
}

interface ListAppointmentsResponse {
  appointments: Appointment[];
  count: number;
  hasMore: boolean;
  metricsByUser: AppointmentUserMetric[];
}

const ListAppointmentsService = async ({
  companyId,
  userId,
  profile,
  scheduleId,
  status,
  startDate,
  endDate,
  pageNumber = "1",
  leadPhone
}: ListAppointmentsQuery): Promise<ListAppointmentsResponse> => {
  const where: any = { companyId };

  // Se não for admin, filtra apenas compromissos das agendas do próprio usuário
  if (profile !== "admin" && userId) {
    const userSchedules = await UserSchedule.findAll({
      where: { userId, companyId },
      attributes: ["id"]
    });
    const scheduleIds = userSchedules.map(s => s.id);
    
    if (scheduleId) {
      // Se especificou uma agenda, verifica se é do usuário
      if (scheduleIds.includes(Number(scheduleId))) {
        where.scheduleId = scheduleId;
      } else {
        // Não tem permissão, retorna vazio
        where.scheduleId = { [Op.in]: [] };
      }
    } else {
      where.scheduleId = { [Op.in]: scheduleIds };
    }
  } else if (scheduleId) {
    // Admin pode ver qualquer agenda
    where.scheduleId = scheduleId;
  }

  if (status) {
    where.status = status;
  }

  if (leadPhone) {
    where.leadPhone = { [Op.like]: `%${leadPhone}%` };
  }

  if (startDate && endDate) {
    where.startDatetime = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  } else if (startDate) {
    where.startDatetime = {
      [Op.gte]: new Date(startDate)
    };
  } else if (endDate) {
    where.startDatetime = {
      [Op.lte]: new Date(endDate)
    };
  }

  const limit = 50;
  const offset = limit * (Number(pageNumber) - 1);

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: UserSchedule,
        as: "schedule",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"]
          }
        ]
      },
      {
        model: Servico,
        as: "service",
        attributes: ["id", "nome", "valorOriginal", "valorComDesconto"]
      },
      {
        model: CrmClient,
        as: "client",
        attributes: ["id", "name", "email", "phone"]
      },
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"]
      },
      {
        model: User,
        as: "createdByUser",
        attributes: ["id", "name"],
        required: false
      }
    ],
    limit,
    offset,
    order: [["startDatetime", "DESC"]]
  });

  const metricsByUser = await GetAppointmentMetricsByUserService({
    companyId,
    where
  });

  return {
    appointments: rows,
    count,
    hasMore: count > offset + rows.length,
    metricsByUser
  };
};

export default ListAppointmentsService;
