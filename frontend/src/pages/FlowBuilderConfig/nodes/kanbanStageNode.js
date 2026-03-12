import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  ViewKanban,
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { Handle } from "react-flow-renderer";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);

  const stageColor = data?.data?.color || data?.color || "#3b82f6";

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
        border: "2px solid #e5e7eb",
        boxShadow: isHovered 
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.1)"
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
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
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
            justifyContent: "center",
          }}
        >
          <Delete sx={{ width: "14px", height: "14px", color: "#ef4444" }} />
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
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
          }}
        >
          <ViewKanban sx={{ width: "18px", height: "18px", color: "#ffffff" }} />
        </div>
        <div>
          <div style={{ color: "#111827", fontSize: "16px", fontWeight: "700" }}>Etapa Kanban</div>
          <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "500" }}>Mover Opportunity</div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          backgroundColor: "#eff6ff",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid #bfdbfe",
          marginBottom: "12px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
          Pipeline: <b>{data?.data?.pipelineName || "Nenhum"}</b>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: stageColor,
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: `0 4px 12px ${stageColor}40`,
          }}
        >
          {data?.data?.stageName || "Selecione um Estágio"}
        </div>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position="right"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          width: "16px",
          height: "16px",
          right: "-10px",
          top: "50%",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
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
