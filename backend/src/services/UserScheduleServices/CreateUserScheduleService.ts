import * as Yup from "yup";
import AppError from "../../errors/AppError";
import UserSchedule from "../../models/UserSchedule";
import User from "../../models/User";

interface CreateUserScheduleData {
  name: string;
  description?: string;
  active?: boolean;
  userIds: number[];
  companyId: number;
}

const CreateUserScheduleService = async (
  data: CreateUserScheduleData
): Promise<UserSchedule> => {
  const schema = Yup.object().shape({
    name: Yup.string().required("Nome é obrigatório").max(100),
    description: Yup.string().nullable(),
    active: Yup.boolean().default(true),
    userIds: Yup.array().of(Yup.number().required()).min(1, "Selecione ao menos um usuário").required("Usuário(s) são obrigatórios"),
    companyId: Yup.number().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Verifica se o primeiro usuário existe como dono principal
  const user = await User.findOne({
    where: { id: data.userIds[0], companyId: data.companyId }
  });

  if (!user) {
    throw new AppError("Usuário principal não encontrado", 404);
  }

  const schedule = await UserSchedule.create({
    name: data.name,
    description: data.description || null,
    active: data.active ?? true,
    userId: data.userIds[0], // Guardando o primeiro como dono para retrocompatibilidade
    companyId: data.companyId
  });

  if (data.userIds && data.userIds.length > 0) {
    await schedule.$set("users", data.userIds);
  }

  // Reload to include users
  await schedule.reload({
    include: ["users"]
  });

  return schedule;
};

export default CreateUserScheduleService;
