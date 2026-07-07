/**
 * Fase 0 — Regressão: redação de segredos em logs do FlowBuilder.
 *
 * Garante que safeStringify (usado nos logs dos nós openai/directOpenai do
 * executor) nunca imprima apiKey/token/secret/… em texto claro.
 */

import { safeStringify, REDACTED } from "../services/WebhookService/logRedaction";

describe("FlowBuilder — safeStringify (redação de segredos em log)", () => {
  it("redige apiKey/token/secret/authorization/password", () => {
    const out = safeStringify({
      apiKey: "sk-super-secreta-123",
      api_key: "sk-outra",
      apiToken: "tok_abc",
      token: "bearer_xyz",
      secret: "shh",
      authorization: "Bearer zzz",
      password: "p@ss"
    });
    expect(out).not.toContain("sk-super-secreta-123");
    expect(out).not.toContain("sk-outra");
    expect(out).not.toContain("tok_abc");
    expect(out).not.toContain("bearer_xyz");
    expect(out).not.toContain("shh");
    expect(out).not.toContain("p@ss");
    expect(out).toContain(REDACTED);
  });

  it("redige segredos ANINHADOS (config do directOpenai)", () => {
    const openAiSettings = {
      model: "gemini-2.0-flash",
      temperature: 0.7,
      apiKey: "gk-nested-secret",
      nested: { deep: { token: "deep-token" } }
    };
    const out = safeStringify(openAiSettings);
    expect(out).not.toContain("gk-nested-secret");
    expect(out).not.toContain("deep-token");
    // dados não sensíveis permanecem visíveis
    expect(out).toContain("gemini-2.0-flash");
    expect(out).toContain("0.7");
  });

  it("preserva valores não sensíveis", () => {
    const out = safeStringify({ name: "Agente", queueId: 5, active: true });
    expect(out).toContain("Agente");
    expect(out).toContain("5");
    expect(out).toContain("true");
    expect(out).not.toContain(REDACTED);
  });

  it("não lança em objeto com referência circular", () => {
    const a: any = { apiKey: "x" };
    a.self = a;
    expect(() => safeStringify(a)).not.toThrow();
    expect(safeStringify(a)).toBe("[unserializable]");
  });
});
