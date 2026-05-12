import AppError from "../../errors/AppError";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import DeleteAppointmentService from "../AppointmentServices/DeleteAppointmentService";
import DispatchExternalAgentEventService from "../AiExternalAgentServices/DispatchExternalAgentEventService";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";

interface Request {
  id: number;
  companyId: number;
  userId?: number;
}

const DeleteAiExternalAppointmentService = async ({
  id,
  companyId,
  userId
}: Request): Promise<void> => {
  const aiAppointment = await AiExternalAppointment.findOne({
    where: { id, companyId }
  });

  if (!aiAppointment) {
    throw new AppError("Agendamento IA nao encontrado.", 404);
  }

  const appointmentId = aiAppointment.appointmentId;

  if (appointmentId) {
    await DeleteAppointmentService(appointmentId, companyId);
  }

  await aiAppointment.destroy();

  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });

  await DispatchExternalAgentEventService({
    eventType: "external_agent.appointment.deleted",
    companyId,
    config,
    userId,
    data: {
      aiAppointmentId: id,
      appointmentId
    }
  });
};

export default DeleteAiExternalAppointmentService;
