import { normalizeListSections } from "../helpers/SendInteractiveMessage";

describe("normalizeListSections", () => {
  it("normalizes legacy flat list items into a single section", () => {
    const result = normalizeListSections([
      { displayText: "Financeiro", value: "financeiro", description: "Boletos e pagamentos" },
      { displayText: "Suporte", value: "suporte", description: "Ajuda técnica" }
    ]);

    expect(result).toEqual([
      {
        title: "Opções",
        rows: [
          { title: "Financeiro", rowId: "financeiro", description: "Boletos e pagamentos" },
          { title: "Suporte", rowId: "suporte", description: "Ajuda técnica" }
        ]
      }
    ]);
  });

  it("preserves grouped sections and fills missing defaults", () => {
    const result = normalizeListSections([
      {
        title: "",
        rows: [
          { title: "Comercial", rowId: "", description: "" },
          { title: "", rowId: "outros", description: "Falar com equipe" }
        ]
      }
    ]);

    expect(result).toEqual([
      {
        title: "Opções 1",
        rows: [
          { title: "Comercial", rowId: "row_1_1", description: undefined },
          { title: "Opção 2", rowId: "outros", description: "Falar com equipe" }
        ]
      }
    ]);
  });
});
