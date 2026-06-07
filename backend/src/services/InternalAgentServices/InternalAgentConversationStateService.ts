import { Sequelize } from "sequelize";
import InternalAgentConversationState from "../../models/InternalAgentConversationState";

const getOrCreateState = async (
  companyId: number,
  contactId: number,
  ticketId: number,
  promptId: number
): Promise<InternalAgentConversationState> => {
  const [state] = await InternalAgentConversationState.findOrCreate({
    where: { companyId, contactId, ticketId },
    defaults: {
      companyId,
      contactId,
      ticketId,
      promptId,
      status: "active",
      turnCount: 0,
      lastActivity: new Date()
    }
  });
  return state;
};

const incrementTurn = async (stateId: string): Promise<void> => {
  await InternalAgentConversationState.update(
    {
      turnCount: Sequelize.literal("\"turnCount\" + 1") as any,
      lastActivity: new Date(),
      status: "active"
    },
    { where: { id: stateId } }
  );
};

const getActiveState = async (
  companyId: number,
  contactId: number,
  ticketId: number
): Promise<InternalAgentConversationState | null> => {
  return InternalAgentConversationState.findOne({
    where: { companyId, contactId, ticketId, status: "active" }
  });
};

const InternalAgentConversationStateService = {
  getOrCreateState,
  incrementTurn,
  getActiveState
};

export default InternalAgentConversationStateService;
