import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import Company from "../../models/Company";
import CreateOpportunityService from "../OpportunityServices/CreateOpportunityService";

const MigrateLegacyKanbanService = async (): Promise<void> => {
    const companies = await Company.findAll();

    for (const company of companies) {
        const kanbanTags = await Tag.findAll({
            where: {
                companyId: company.id,
                kanban: 1
            },
            order: [["id", "ASC"]]
        });

        if (kanbanTags.length === 0) continue;

        // Check if "Kanban Herdado" pipeline already exists
        let pipeline = await Pipeline.findOne({
            where: {
                companyId: company.id,
                name: "Kanban Herdado"
            }
        });

        if (!pipeline) {
            pipeline = await Pipeline.create({
                companyId: company.id,
                name: "Kanban Herdado",
                isDefault: false
            });
        }

        for (const tag of kanbanTags) {
            // Check if stage exists for this tag
            let stage = await PipelineStage.findOne({
                where: {
                    pipelineId: pipeline.id,
                    name: tag.name
                }
            });

            if (!stage) {
                stage = await PipelineStage.create({
                    pipelineId: pipeline.id,
                    companyId: company.id,
                    name: tag.name,
                    color: tag.color,
                    order: kanbanTags.indexOf(tag)
                });
            }

            // Find all tickets with this tag
            const ticketTags = await TicketTag.findAll({
                where: { tagId: tag.id }
            });

            for (const tt of ticketTags) {
                const ticket = await Ticket.findByPk(tt.ticketId);
                if (!ticket) continue;

                // Check if opportunity already exists for this ticket in this pipeline
                const existingOpp = await Opportunity.findOne({
                    where: {
                        companyId: company.id,
                        ticketId: ticket.id,
                        pipelineId: pipeline.id
                    }
                });

                if (!existingOpp) {
                    await CreateOpportunityService({
                        companyId: company.id,
                        pipelineId: pipeline.id,
                        stageId: stage.id,
                        contactId: ticket.contactId,
                        ticketId: ticket.id,
                        assignedUserId: ticket.userId,
                        title: `Ticket #${ticket.id}`,
                        value: 0
                    });
                }
            }
        }
    }
};

export default MigrateLegacyKanbanService;
