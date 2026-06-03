import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  DriveFileRenameOutline,
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);
  const config = data?.data || data || {};
  const fields = Array.isArray(config.fields) ? config.fields : [];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 16,
        minWidth: 300,
        maxWidth: 300,
        width: 300,
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #bfdbfe",
        boxShadow: isHovered
          ? "0 12px 32px rgba(59, 130, 246, 0.16)"
          : "0 4px 16px rgba(0, 0, 0, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          width: 16,
          height: 16,
          top: 24,
          left: -10,
          border: "3px solid #ffffff",
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos sx={{ color: "#ffffff", width: 8, height: 8, marginLeft: 2.5 }} />
      </Handle>

      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 16,
          top: 16,
          gap: 8,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ContentCopy sx={{ width: 14, height: 14, color: "#6b7280" }} />
        </div>
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Delete sx={{ width: 14, height: 14, color: "#ef4444" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <DriveFileRenameOutline sx={{ width: 18, height: 18, color: "#ffffff" }} />
        </div>
        <div>
          <div style={{ color: "#111827", fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
            Atualizar Campo do Contato
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 500 }}>
            Gravar dados no CRM
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "#eff6ff", padding: 14, borderRadius: 12, border: "1px solid #bfdbfe", marginBottom: 16 }}>
        <div style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 700 }}>
          {fields.length || 0} campos configurados
        </div>
        <div style={{ color: "#2563eb", fontSize: 12, marginTop: 4 }}>
          {fields[0]?.fieldKey || "Selecione os campos"}
        </div>
      </div>

      <Handle
        type="source"
        position="right"
        id="success"
        style={{ background: "#10b981", width: 16, height: 16, right: -10, top: "43%", border: "3px solid #ffffff" }}
        isConnectable={isConnectable}
      />
      <div style={{ position: "absolute", right: 20, top: "calc(43% - 8px)", fontSize: 10, fontWeight: 700, color: "#10b981" }}>
        Sucesso
      </div>
      <Handle
        type="source"
        position="right"
        id="error"
        style={{ background: "#ef4444", width: 16, height: 16, right: -10, top: "57%", border: "3px solid #ffffff" }}
        isConnectable={isConnectable}
      />
      <div style={{ position: "absolute", right: 20, top: "calc(57% - 8px)", fontSize: 10, fontWeight: 700, color: "#ef4444" }}>
        Erro
      </div>
    </div>
  );
});
