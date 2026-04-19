import { ArrowForwardIos, RocketLaunch, AddCircleOutline } from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";

const TRIGGER_LABELS = {
  message_received:    { label: "Mensagem recebida",     color: "#3b82f6", bg: "#eff6ff" },
  ticket_created:      { label: "Atendimento iniciado",  color: "#8b5cf6", bg: "#f5f3ff" },
  ticket_closed:       { label: "Atendimento finalizado",color: "#10b981", bg: "#f0fdf4" },
  lead_created:        { label: "Lead criado",           color: "#f59e0b", bg: "#fffbeb" },
  opportunity_created: { label: "Negócio criado",        color: "#06b6d4", bg: "#ecfeff" },
  opportunity_moved:   { label: "Negócio movido",        color: "#6366f1", bg: "#eef2ff" },
  opportunity_won:     { label: "Negócio ganho",         color: "#10b981", bg: "#f0fdf4" },
  opportunity_lost:    { label: "Negócio perdido",       color: "#ef4444", bg: "#fef2f2" },
  http_webhook:        { label: "Webhook HTTP",          color: "#0ea5e9", bg: "#f0f9ff" },
  flow_triggered:      { label: "Outra automação",       color: "#a855f7", bg: "#faf5ff" },
};

export default memo(({ data, isConnectable }) => {
  const [isHovered, setIsHovered] = useState(false);
  const triggers = data?.triggers || [];

  const openModal = (e) => {
    e.stopPropagation();
    if (data?.onOpenTriggerModal) data.onOpenTriggerModal();
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        minWidth: "280px",
        maxWidth: "280px",
        width: "280px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: triggers.length > 0 ? "2px solid #10b981" : "2px dashed #d1fae5",
        boxShadow: isHovered
          ? "0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(16,185,129,0.1)"
          : "0 4px 16px rgba(0,0,0,0.06)",
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginRight: 12, boxShadow: "0 4px 12px rgba(16,185,129,0.25)", flexShrink: 0,
          }}
        >
          <RocketLaunch sx={{ width: 18, height: 18, color: "#fff" }} />
        </div>
        <div>
          <div style={{ color: "#111827", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Início</div>
          <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 500 }}>Gatilho de entrada</div>
        </div>
      </div>

      {/* Trigger display */}
      {triggers.length === 0 ? (
        <div
          style={{
            border: "1.5px dashed #d1d5db", borderRadius: 10,
            padding: "14px 10px", textAlign: "center", cursor: "pointer", background: "#fafafa",
          }}
          onDoubleClick={openModal}
        >
          <AddCircleOutline sx={{ width: 22, height: 22, color: "#9ca3af", mb: 0.5 }} />
          <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>+ Adicionar gatilho</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            O gatilho define quando este fluxo inicia
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {triggers.map((t) => {
            const meta = TRIGGER_LABELS[t.type] || { label: t.type, color: "#374151", bg: "#f9fafb" };
            return (
              <div
                key={t.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 8,
                  background: meta.bg, border: `1px solid ${meta.color}30`,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: meta.color, flex: 1 }}>{meta.label}</span>
                {t.config?.keyword && (
                  <span style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>
                    "{t.config.keyword}"
                  </span>
                )}
              </div>
            );
          })}
          <div
            style={{ textAlign: "center", fontSize: 11, color: "#6b7280", paddingTop: 4, cursor: "pointer", fontWeight: 600 }}
            onDoubleClick={openModal}
          >
            + Editar / adicionar gatilho (duplo clique)
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingTop: 10, marginTop: 12, borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
        Quando o evento ocorrer, então →
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          background: "linear-gradient(135deg, #10b981, #059669)",
          width: 16, height: 16, right: -10, top: "50%",
          cursor: "pointer", border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos sx={{ color: "#ffffff", width: 8, height: 8, marginLeft: "2px", marginBottom: "0.5px", pointerEvents: "none" }} />
      </Handle>
    </div>
  );
});
