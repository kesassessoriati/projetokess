
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // Tickets: (companyId, status)
        await queryInterface.addIndex("Tickets", ["companyId", "status"], {
            name: "idx_tickets_company_status"
        });

        // Campaigns: (companyId, status, scheduledAt)
        await queryInterface.addIndex("Campaigns", ["companyId", "status", "scheduledAt"], {
            name: "idx_campaigns_company_status_scheduled"
        });

        // Schedules: (companyId, status, sendAt)
        await queryInterface.addIndex("Schedules", ["companyId", "status", "sendAt"], {
            name: "idx_schedules_company_status_sendat"
        });

        // Contacts: (companyId, number)
        await queryInterface.addIndex("Contacts", ["companyId", "number"], {
            name: "idx_contacts_company_number"
        });

        // CampaignSettings: (companyId, key)
        await queryInterface.addIndex("CampaignSettings", ["companyId", "key"], {
            name: "idx_campaignsettings_company_key"
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeIndex("Tickets", "idx_tickets_company_status");
        await queryInterface.removeIndex("Campaigns", "idx_campaigns_company_status_scheduled");
        await queryInterface.removeIndex("Schedules", "idx_schedules_company_status_sendat");
        await queryInterface.removeIndex("Contacts", "idx_contacts_company_number");
        await queryInterface.removeIndex("CampaignSettings", "idx_campaignsettings_company_key");
    }
};
