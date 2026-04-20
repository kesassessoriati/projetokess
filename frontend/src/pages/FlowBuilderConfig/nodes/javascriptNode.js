import { ArrowForwardIos, Code, ContentCopy, Delete } from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  const codePreview = data.code
    ? data.code.split("\n").slice(0, 4).join("\n") + (data.code.split("\n").length > 4 ? "\n..." : "")
    : null;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        minWidth: "260px",
        maxWidth: "260px",
        width: "260px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #e5e7eb",
        boxShadow: isHovered
          ? "0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(249,115,22,0.1)"
          : "0 4px 16px rgba(0,0,0,0.06)",
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
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
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          width: 16, height: 16, left: -10, top: 24,
          cursor: "pointer", border: "3px solid #fff",
          boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos sx={{ color: "#fff", width: 8, height: 8, marginLeft: "2.5px", marginBottom: "0.5px", pointerEvents: "none" }} />
      </Handle>

      {/* Action Buttons */}
      <div style={{ display: "flex", position: "absolute", right: 16, top: 16, gap: 8, opacity: isHovered ? 1 : 0, transition: "opacity 0.2s" }}>
        <div
          onClick={() => { storageItems.setNodesStorage(id); storageItems.setAct("duplicate"); }}
          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <ContentCopy sx={{ width: 14, height: 14, color: "#6b7280" }} />
        </div>
        <div
          onClick={() => { storageItems.setNodesStorage(id); storageItems.setAct("delete"); }}
          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Delete sx={{ width: 14, height: 14, color: "#ef4444" }} />
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 12, boxShadow: "0 4px 12px rgba(249,115,22,0.25)", flexShrink: 0,
        }}>
          <Code sx={{ width: 18, height: 18, color: "#fff" }} />
        </div>
        <div>
          <div style={{ color: "#111827", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>JavaScript</div>
          <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 500 }}>Executar código personalizado</div>
        </div>
      </div>

      {/* Code Preview */}
      {codePreview ? (
        <div style={{
          background: "#1e1e2e",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 14,
          fontFamily: "monospace",
          fontSize: 11,
          color: "#cdd6f4",
          lineHeight: 1.5,
          whiteSpace: "pre",
          overflow: "hidden",
          maxHeight: 80,
          border: "1px solid #313244",
        }}>
          {codePreview}
        </div>
      ) : (
        <div style={{
          border: "1.5px dashed #d1d5db",
          borderRadius: 10,
          padding: "14px 10px",
          textAlign: "center",
          marginBottom: 14,
          background: "#fafafa",
        }}>
          <Code sx={{ width: 22, height: 22, color: "#9ca3af", mb: 0.5 }} />
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Dê duplo clique para configurar o código</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ paddingTop: 10, borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
        Próximo passo →
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          width: 16, height: 16, right: -10, top: "50%",
          cursor: "pointer", border: "3px solid #fff",
          boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos sx={{ color: "#fff", width: 8, height: 8, marginLeft: "2px", marginBottom: "0.5px", pointerEvents: "none" }} />
      </Handle>
    </div>
  );
});
