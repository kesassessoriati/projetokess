
import { runWithContext } from "../context";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import sequelize from "../database";

describe("Multi-Tenant Structural Shielding", () => {
    // Antes de todos os testes, garantimos que o banco está conectado e hooks registrados
    beforeAll(async () => {
        // No ambiente real de teste, o sequelize já estaria inicializado
        // Aqui apenas validamos se o hook existe
        const hasFindHook = sequelize.hasHook("beforeFind");
        expect(hasFindHook).toBe(true);
    });

    it("should NOT allow cross-tenant access even when querying by ID directly", async () => {
        // Simulamos que a Empresa 1 está logada
        // E tenta acessar um Ticket que sabemos (pelo mock ou dados controlados) que é da Empresa 2

        // Criamos dados de teste (isso depende de um DB de teste configurado)
        // Para efeito de demonstração de lógica:

        const company1Id = 1;
        const company2Id = 2;

        // Cenário: Rodando em contexto da Empresa 1
        await runWithContext({ companyId: company1Id }, async () => {
            // Se tentarmos buscar um ticket da empresa 2
            // O hook injetará `where: { companyId: 1 }`
            // O resultado será null (ou erro se forçar), mesmo que o ID exista no banco

            const options: any = { where: { id: 999 } }; // Supondo que ID 999 é da Empresa 2

            // Acionamos manualmente o hook para validar a modificação do options
            // (Em produção isso ocorre automaticamente no Ticket.findOne)
            (sequelize as any).runHooks('beforeFind', options);

            expect(options.where.companyId).toBe(company1Id);
            expect(options.where.id).toBe(999);
        });
    });

    it("should enforce companyId on creation from context", async () => {
        const company3Id = 3;

        await runWithContext({ companyId: company3Id }, async () => {
            const ticket = Ticket.build({
                status: "pending",
                contactId: 1,
                // NÃO informamos companyId intencionalmente
            });

            // Acionamos o hook de criação
            (sequelize as any).runHooks('beforeCreate', ticket);

            expect(ticket.companyId).toBe(company3Id);
        });
    });

    it("should preserve explicit companyId on creation", async () => {
        const contextCompanyId = 3;
        const explicitCompanyId = 4;

        await runWithContext({ companyId: contextCompanyId }, async () => {
            const ticket = Ticket.build({
                status: "pending",
                contactId: 1,
                companyId: explicitCompanyId
            });

            (sequelize as any).runHooks("beforeCreate", ticket);

            expect(ticket.companyId).toBe(explicitCompanyId);
        });
    });
});
