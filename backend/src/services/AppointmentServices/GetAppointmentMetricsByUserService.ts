import { col, fn } from "sequelize";
import Appointment from "../../models/Appointment";
import User from "../../models/User";

export interface AppointmentUserMetric {
  userId: number;
  userName: string;
  count: number;
}

interface Request {
  companyId: number;
  where: any;
}

interface AppointmentCountRow {
  createdByUserId: number | string | null;
  count: number | string;
}

const GetAppointmentMetricsByUserService = async ({
  companyId,
  where
}: Request): Promise<AppointmentUserMetric[]> => {
  const [users, appointmentCounts] = await Promise.all([
    User.findAll({
      where: { companyId },
      attributes: ["id", "name"],
      order: [["name", "ASC"]]
    }),
    Appointment.findAll({
      where,
      attributes: [
        "createdByUserId",
        [fn("COUNT", col("Appointment.id")), "count"]
      ],
      group: ["createdByUserId"],
      raw: true
    }) as unknown as Promise<AppointmentCountRow[]>
  ]);

  const countsByUserId = new Map<number, number>();

  appointmentCounts.forEach(item => {
    if (item.createdByUserId == null) {
      return;
    }

    countsByUserId.set(
      Number(item.createdByUserId),
      Number(item.count) || 0
    );
  });

  return users.map(user => ({
    userId: user.id,
    userName: user.name,
    count: countsByUserId.get(user.id) || 0
  }));
};

export default GetAppointmentMetricsByUserService;
