// Regressão estrutural T1/T2: o dispatch global de "message_received" precisa
// ser avaliado no handleMessage ANTES do roteamento legado de integrações do
// canal, e os três blocos legados precisam estar gateados por
// !flowTriggerHandled (precedência: gatilhos novos > legado, sem duplo
// disparo). O listener importa baileys e não é testável unitariamente sem
// mock pesado — a verificação aqui é estática sobre o código-fonte.

import fs from "fs";
import path from "path";

const source = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "services",
    "WbotServices",
    "wbotMessageListener.ts"
  ),
  "utf-8"
);

describe("wbotMessageListener — precedência gatilhos novos vs legado (T1/T2)", () => {
  it("check global roda antes do roteamento legado de integração do canal", () => {
    const globalCheckIdx = source.indexOf("flowbuilder_global_trigger_check");
    const legacyIntegrationIdx = source.indexOf("//integraçao na conexao");

    expect(globalCheckIdx).toBeGreaterThan(-1);
    expect(legacyIntegrationIdx).toBeGreaterThan(-1);
    expect(globalCheckIdx).toBeLessThan(legacyIntegrationIdx);
  });

  it("os três blocos legados são gateados por !flowTriggerHandled", () => {
    const gates = source.match(/!flowTriggerHandled &&/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(3);
  });

  it("dispatch de message_received existe em um único ponto (sem duplo disparo)", () => {
    const occurrences =
      source.match(/dispatchFlowTrigger\(\s*"message_received"/g) || [];
    expect(occurrences.length).toBe(1);
  });

  it("guards de fromMe e grupo presentes no check global", () => {
    const block = source.slice(
      source.indexOf("let flowTriggerHandled = false"),
      source.indexOf("//integraçao na conexao")
    );
    expect(block).toContain("!msg.key.fromMe");
    expect(block).toContain("group_not_supported");
    expect(block).toContain("existing_flow_waiting_response");
    expect(block).toContain("dispatcher_error");
  });

  it("logs obrigatórios do check global presentes", () => {
    expect(source).toContain("flowbuilder_global_trigger_check");
    expect(source).toContain("flowbuilder_global_trigger_matched");
    expect(source).toContain("flowbuilder_global_trigger_no_match");
    expect(source).toContain("flowbuilder_global_trigger_skipped_reason");
  });
});
