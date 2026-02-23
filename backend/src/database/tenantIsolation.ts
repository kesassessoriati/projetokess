
import { Sequelize } from "sequelize-typescript";
import { getContext } from "../context";

export const applyTenantIsolation = (sequelize: Sequelize) => {
    sequelize.addHook("beforeFind", (options: any) => {
        const context = getContext();
        if (context?.companyId) {
            const model = options.model;
            // Verifica se a Model possui o atributo companyId
            if (model && model.rawAttributes && model.rawAttributes.companyId) {
                if (!options.where) {
                    options.where = {};
                }

                // Se o where for um objeto e não contiver companyId, injeta do contexto
                if (typeof options.where === "object" && !("companyId" in options.where)) {
                    options.where.companyId = context.companyId;
                }
            }
        }
    });

    sequelize.addHook("beforeCreate", (instance: any, options: any) => {
        const context = getContext();
        if (context?.companyId) {
            const model = instance.constructor;
            if (model && model.rawAttributes && model.rawAttributes.companyId) {
                instance.set("companyId", context.companyId);
            }
        }
    });

    // Também para updates em lote
    sequelize.addHook("beforeBulkUpdate", (options: any) => {
        const context = getContext();
        if (context?.companyId) {
            const model = options.model;
            if (model && model.rawAttributes && model.rawAttributes.companyId) {
                if (!options.where) {
                    options.where = {};
                }
                if (typeof options.where === "object" && !("companyId" in options.where)) {
                    options.where.companyId = context.companyId;
                }
            }
        }
    });
};
