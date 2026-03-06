import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  Schedule,
  Help,
  Timer,
  AttachFile,
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  const formatDelay = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatTimeout = (time, unit) => {
    const minutes = unit === "hours" ? time * 60 : time;
    return formatDelay(minutes);
  };

  const getActionLabel = (action) => {
    if (!action) return "Ação não definida";
    switch (action.type) {
      case "sendMessageFlow":
        return "Enviar mensagem";
      case "addTag":
        return `Tags: ${action.payload?.tags?.length || 0} selecionada(s)`;
      case "addTagKanban":
        return `Kanban: ${action.payload?.kanbanTagId ? "1 etapa" : "..."}`;
      case "transferQueue":
        return `Fila: ${action.payload?.queueId ? "Selecionada" : "..."}`;
      case "closeTicket":
        return "Fechar ticket";
      case "transferFlow":
        return "Transferir fluxo";
      default:
        return action.type;
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        maxWidth: "320px",
        minWidth: "320px",
        width: "320px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #e5e7eb",
        boxShadow: isHovered
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(251, 146, 60, 0.1)"
          : "0 4px 16px rgba(0, 0, 0, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position="left"
        style={{
          background: "linear-gradient(135deg, #fb923c, #f97316)",
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(251, 146, 60, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onConnect={params => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffffff",
            width: "8px",
            height: "8px",
            marginLeft: "2.5px",
            marginBottom: "0.5px",
            pointerEvents: "none"
          }}
        />
      </Handle>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "16px",
          top: "16px",
          cursor: "pointer",
          gap: "8px",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#e5e7eb";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
            e.target.style.transform = "scale(1)";
          }}
        >
          <ContentCopy
            style={{
              width: "14px",
              height: "14px",
              color: "#6b7280"
            }}
          />
        </div>
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#fee2e2";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#fef2f2";
            e.target.style.transform = "scale(1)";
          }}
        >
          <Delete
            style={{
              width: "14px",
              height: "14px",
              color: "#ef4444"
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #fb923c, #f97316)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            boxShadow: "0 4px 12px rgba(251, 146, 60, 0.25)",
            position: "relative"
          }}
        >
          <Schedule
            style={{
              width: "18px",
              height: "18px",
              color: "#ffffff",
            }}
          />
          <Help
            style={{
              width: "16px",
              height: "16px",
              color: "#3b82f6",
              cursor: "pointer"
            }}
          />
        </div>
        <div>
          <div
            style={{
              color: "#111827",
              fontSize: "16px",
              fontWeight: "700",
              lineHeight: "1.2",
              marginBottom: "2px",
            }}
          >
            Espera Condicional
          </div>
          <div
            style={{
              color: "#6b7280",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            Pergunta após tempo
          </div>
        </div>
      </div>

      {/* Config Summary */}
      <div
        style={{
          color: "#374151",
          fontSize: "13px",
          lineHeight: "1.5",
          backgroundColor: "#f9fafb",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid #f3f4f6",
          marginBottom: "12px",
          minHeight: "80px",
        }}
      >
        <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Schedule style={{ width: "14px", height: "14px", color: "#f97316" }} />
          <strong>Espera:</strong> {data.waitTime && data.waitUnit ? formatDelay(data.waitUnit === "hours" ? data.waitTime * 60 : data.waitTime) : "Não definido"}
        </div>
        
        {data.mediaType && data.mediaType !== "none" && (
          <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <AttachFile style={{ width: "14px", height: "14px", color: "#f97316" }} />
            <strong>Mídia:</strong> {data.mediaType} {data.mediaName ? `(${data.mediaName})` : ""}
          </div>
        )}
        
        <div style={{ marginBottom: "8px" }}>
          <strong>Pergunta:</strong> {data.question ? data.question.substring(0, 25) + (data.question.length > 25 ? "..." : "") : "Não definida"}
        </div>
        
        <div style={{ display: "flex", gap: "16px" }}>
          <div>
            <strong>Opção X:</strong> {data.optionX?.label || "-"}
          </div>
          <div>
            <strong>Opção Y:</strong> {data.optionY?.label || "-"}
          </div>
        </div>
      </div>

      {/* Timeout Info */}
      {data.timeoutEnabled && (
        <div
          style={{
            color: "#374151",
            fontSize: "12px",
            lineHeight: "1.5",
            backgroundColor: "#fef3c7",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #fde68a",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Timer style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
            <strong>Timeout:</strong> {formatTimeout(data.timeoutTime || 60, data.timeoutUnit || "minutes")}
            <span style={{ marginLeft: "8px", color: "#92400e" }}>
              → {data.timeoutAction === "close" ? "Fechar" : data.timeoutAction === "transfer" ? "Transferir" : "Continuar"}
            </span>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div
        style={{
          paddingTop: "12px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Schedule style={{ width: "12px", height: "12px", marginRight: "4px" }} />
          Componente Espera Condicional
        </div>
      </div>

      {/* Source Handles com Labels */}
      <div style={{ position: "absolute", right: "-10px", top: "35%", display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Handle X */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{
            position: "absolute",
            right: "22px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#10b981",
            background: "#ecfdf5",
            padding: "1px 6px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            {data.optionX?.label || "X"}
          </span>
          <Handle
            type="source"
            position="right"
            id="x"
            style={{
              position: "relative",
              top: "auto",
              right: "auto",
              transform: "none",
              background: "#10b981",
              border: "3px solid #ffffff",
              width: "16px",
              height: "16px",
              cursor: 'pointer',
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            }}
            isConnectable={isConnectable}
          >
            <ArrowForwardIos
              sx={{
                color: "#ffffff",
                width: "8px",
                height: "8px",
                marginLeft: "2.5px",
                marginBottom: "0.5px",
                pointerEvents: "none"
              }}
            />
          </Handle>
        </div>

        {/* Handle Y */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{
            position: "absolute",
            right: "22px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#f97316",
            background: "#fff7ed",
            padding: "1px 6px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            {data.optionY?.label || "Y"}
          </span>
          <Handle
            type="source"
            position="right"
            id="y"
            style={{
              position: "relative",
              top: "auto",
              right: "auto",
              transform: "none",
              background: "#f97316",
              border: "3px solid #ffffff",
              width: "16px",
              height: "16px",
              cursor: 'pointer',
              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.3)",
            }}
            isConnectable={isConnectable}
          >
            <ArrowForwardIos
              sx={{
                color: "#ffffff",
                width: "8px",
                height: "8px",
                marginLeft: "2.5px",
                marginBottom: "0.5px",
                pointerEvents: "none"
              }}
            />
          </Handle>
        </div>

        {/* Handle Timeout */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{
            position: "absolute",
            right: "22px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#f59e0b",
            background: "#fffbeb",
            padding: "1px 6px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}>
            Timeout
          </span>
          <Handle
            type="source"
            position="right"
            id="timeout"
            style={{
              position: "relative",
              top: "auto",
              right: "auto",
              transform: "none",
              background: "#f59e0b",
              border: "3px solid #ffffff",
              width: "16px",
              height: "16px",
              cursor: 'pointer',
              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
            }}
            isConnectable={isConnectable}
          >
            <ArrowForwardIos
              sx={{
                color: "#ffffff",
                width: "8px",
                height: "8px",
                marginLeft: "2.5px",
                marginBottom: "0.5px",
                pointerEvents: "none"
              }}
            />
          </Handle>
        </div>
      </div>
    </div>
  );
});
