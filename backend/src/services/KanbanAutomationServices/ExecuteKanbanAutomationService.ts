import KanbanAutomation from "../../models/KanbanAutomation";
import Opportunity from "../../models/Opportunity";

export const ExecuteKanbanAutomationService = async (
    eventType: string,
    opportunityId: number,
    companyId: number,
    payload?: any
): Promise<void> => {
    try {
        const automations = await KanbanAutomation.findAll({
            where: {
                company_id: companyId,
                status: true
            }
        });

        if (automations.length === 0) return;

        const op = await Opportunity.findByPk(opportunityId, {
            include: ["lead", "contact"]
        });

        if (!op) return;

        for (const automation of automations) {
            if (!automation.estrutura_fluxo || !automation.estrutura_fluxo.nodes) continue;

            // TODO: Implement execution of full flow builder parsing
            // For now we check if any start node matches the eventType
            const hasStartNode = automation.estrutura_fluxo.nodes.some(
                (node: any) => node.type === "start"
            );

            if (hasStartNode) {
                console.log(`[KanbanAutomation] Executing ${automation.nome_automacao} for event ${eventType}`);
                // Execute the nodes linked to start
                // Not implemented
            }
        }
    } catch (err) {
        console.error(`Error executing Kanban Automation: `, err);
    }
};
