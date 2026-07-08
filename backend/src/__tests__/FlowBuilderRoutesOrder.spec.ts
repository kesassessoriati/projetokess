// Regressão da ordem de rotas do FlowBuilder: "/flowbuilder/executions" precisa
// ser registrada ANTES da rota genérica "/flowbuilder/:idFlow", senão o Express
// captura "executions" como idFlow e o endpoint de logs fica inalcançável
// (Bug 3 do QA Build #809 — "Erro ao consultar usuários").

import fs from "fs";
import path from "path";

describe("flowBuilderRoutes — ordem de registro", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "routes", "flowBuilderRoutes.ts"),
    "utf-8"
  );

  it("GET /flowbuilder/executions vem antes de GET /flowbuilder/:idFlow", () => {
    const executionsIdx = source.indexOf('"/flowbuilder/executions"');
    const genericIdx = source.indexOf(
      'flowBuilder.get("/flowbuilder/:idFlow"'
    );

    expect(executionsIdx).toBeGreaterThan(-1);
    expect(genericIdx).toBeGreaterThan(-1);
    expect(executionsIdx).toBeLessThan(genericIdx);
  });

  it("rota de executions aponta para listFlowExecutions", () => {
    const block = source.slice(
      source.indexOf('"/flowbuilder/executions"'),
      source.indexOf('"/flowbuilder/executions"') + 200
    );
    expect(block).toContain("listFlowExecutions");
  });
});
