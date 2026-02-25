import PipelineTemplate from "../../models/PipelineTemplate";

const InitPipelineTemplatesService = async (): Promise<void> => {
    const templates = [
        {
            name: "Vendas Padrão",
            segment: "vendas",
            isDefault: true,
            stages: [
                { name: "Lead", order: 0, color: "#cbd5e1", probability: 10 },
                { name: "Qualificação", order: 1, color: "#93c5fd", probability: 30 },
                { name: "Proposta", order: 2, color: "#fcd34d", probability: 50 },
                { name: "Negociação", order: 3, color: "#c084fc", probability: 80 },
                { name: "Ganho", order: 4, color: "#4ade80", probability: 100 },
                { name: "Perdido", order: 5, color: "#f87171", probability: 0 }
            ]
        },
        {
            name: "Clínica Médica",
            segment: "clinica",
            isDefault: false,
            stages: [
                { name: "Contato", order: 0, color: "#cbd5e1", probability: 20 },
                { name: "Avaliação", order: 1, color: "#93c5fd", probability: 40 },
                { name: "Orçamento", order: 2, color: "#fcd34d", probability: 70 },
                { name: "Retorno", order: 3, color: "#c084fc", probability: 90 },
                { name: "Fechado", order: 4, color: "#4ade80", probability: 100 }
            ]
        },
        {
            name: "Imobiliária",
            segment: "imobiliaria",
            isDefault: false,
            stages: [
                { name: "Lead", order: 0, color: "#cbd5e1", probability: 10 },
                { name: "Visita", order: 1, color: "#93c5fd", probability: 40 },
                { name: "Proposta", order: 2, color: "#fcd34d", probability: 70 },
                { name: "Contrato", order: 3, color: "#c084fc", probability: 90 },
                { name: "Fechado", order: 4, color: "#4ade80", probability: 100 }
            ]
        }
    ];

    for (const template of templates) {
        const [record, created] = await PipelineTemplate.findOrCreate({
            where: { segment: template.segment },
            defaults: template
        });

        if (!created) {
            await record.update(template);
        }
    }
};

export default InitPipelineTemplatesService;
