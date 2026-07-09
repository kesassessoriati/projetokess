import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  SmartButton
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

const TYPE_LABELS = {
  buttons: "Botões",
  list: "Lista",
  carousel: "Carrossel",
  poll: "Enquete"
};

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  const messageType = data?.messageType || "buttons";
  const buttons = Array.isArray(data?.buttons) ? data.buttons : [];
  const text = data?.text || data?.label || "";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        maxWidth: "280px",
        minWidth: "280px",
        width: "280px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #e5e7eb",
        boxShadow: isHovered
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(20, 184, 166, 0.1)"
          : "0 4px 16px rgba(0, 0, 0, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none"
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          background: "linear-gradient(135deg, #14b8a6, #0d9488)",
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: "pointer",
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(20, 184, 166, 0.3)"
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

      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "16px",
          top: "16px",
          cursor: "pointer",
          gap: "8px",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
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
            justifyContent: "center"
          }}
        >
          <ContentCopy sx={{ width: "14px", height: "14px", color: "#6b7280" }} />
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
            justifyContent: "center"
          }}
        >
          <Delete sx={{ width: "14px", height: "14px", color: "#ef4444" }} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f3f4f6"
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #14b8a6, #0d9488)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            boxShadow: "0 4px 12px rgba(20, 184, 166, 0.25)"
          }}
        >
          <SmartButton sx={{ width: "18px", height: "18px", color: "#ffffff" }} />
        </div>
        <div>
          <div
            style={{
              color: "#111827",
              fontSize: "16px",
              fontWeight: "700",
              lineHeight: "1.2",
              marginBottom: "2px"
            }}
          >
            Mensagem Interativa
          </div>
          <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "500" }}>
            {TYPE_LABELS[messageType] || "Botões"}
          </div>
        </div>
      </div>

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
          minHeight: "48px",
          maxHeight: "100px",
          overflow: "auto"
        }}
      >
        {text || "Configure a mensagem interativa"}
      </div>

      {messageType === "buttons" && buttons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {buttons.slice(0, 3).map((btn, idx) => (
            <div
              key={btn.id || idx}
              style={{
                position: "relative",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: "#0d9488",
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderRadius: "8px",
                padding: "6px 8px"
              }}
            >
              {btn.label || btn.displayText || `Botão ${idx + 1}`}
              {/* Saída por botão (input): mesma convenção do Menu (a1..aN).
                  Conectar qualquer uma delas faz o fluxo aguardar a escolha
                  do usuário e seguir pela rota do botão clicado. */}
              <Handle
                type="source"
                position="right"
                id={`a${idx + 1}`}
                style={{
                  top: "50%",
                  background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                  width: "14px",
                  height: "14px",
                  right: "-10px",
                  cursor: "pointer",
                  border: "3px solid #ffffff",
                  boxShadow: "0 2px 8px rgba(20, 184, 166, 0.3)"
                }}
                isConnectable={isConnectable}
              >
                <ArrowForwardIos
                  sx={{
                    color: "#ffffff",
                    width: "7px",
                    height: "7px",
                    marginLeft: "1.5px",
                    marginBottom: "0.5px",
                    pointerEvents: "none"
                  }}
                />
              </Handle>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          paddingTop: "12px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            fontWeight: "500",
            display: "flex",
            alignItems: "center"
          }}
        >
          <SmartButton sx={{ width: "12px", height: "12px", marginRight: "4px" }} />
          {(TYPE_LABELS[messageType] || "Botões") +
            (messageType === "buttons" ? ` • ${buttons.length}` : "")}
        </div>
      </div>

      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          background: "linear-gradient(135deg, #14b8a6, #0d9488)",
          width: "16px",
          height: "16px",
          right: "-10px",
          top: "50%",
          cursor: "pointer",
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(20, 184, 166, 0.3)"
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffffff",
            width: "8px",
            height: "8px",
            marginLeft: "2px",
            marginBottom: "0.5px",
            pointerEvents: "none"
          }}
        />
      </Handle>
    </div>
  );
});
