import {
  Add,
  ArrowForwardIos,
  CallSplit,
  ContentCopy,
  Delete,
} from "@mui/icons-material";
import React, { memo, useState } from "react";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

const BRANCH_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

const getBranchLabel = index => String.fromCharCode(65 + index);

const normalizeBranches = data => {
  if (Array.isArray(data?.branches) && data.branches.length >= 2) {
    return data.branches.map((branch, index) => ({
      id: branch.id || getBranchLabel(index).toLowerCase(),
      label: branch.label || getBranchLabel(index),
      percent: Number(branch.percent) || 0,
      color: branch.color || BRANCH_COLORS[index % BRANCH_COLORS.length],
    }));
  }

  const percent = Number(data?.percent);
  const percentA = Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 50;

  return [
    { id: "a", label: "A", percent: percentA, color: BRANCH_COLORS[0] },
    { id: "b", label: "B", percent: 100 - percentA, color: BRANCH_COLORS[1] },
  ];
};

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);
  const branches = normalizeBranches(data);

  const openEditor = event => {
    event.stopPropagation();
    storageItems.setNodesStorage(id);
    storageItems.setAct("edit");
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "14px",
        borderRadius: "8px",
        width: "260px",
        minWidth: "260px",
        maxWidth: "260px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "1.5px solid #3b82f6",
        boxShadow: isHovered
          ? "0 14px 30px rgba(15, 23, 42, 0.14)"
          : "0 8px 22px rgba(15, 23, 42, 0.08)",
        transition: "all 0.18s ease",
        transform: isHovered ? "translateY(-1px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          background: "#38bdf8",
          width: "12px",
          height: "12px",
          top: "54px",
          left: "-7px",
          cursor: "pointer",
          border: "2px solid #ffffff",
          boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.18)",
        }}
        isConnectable={isConnectable}
      />

      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "10px",
          top: "-38px",
          cursor: "pointer",
          gap: "8px",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.18s ease",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "6px",
          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ContentCopy sx={{ width: "14px", height: "14px", color: "#64748b" }} />
        </div>
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Delete sx={{ width: "14px", height: "14px", color: "#ef4444" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "12px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: "#06b6d4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <CallSplit sx={{ width: "17px", height: "17px", color: "#ffffff" }} />
        </div>
        <div>
          <div style={{ color: "#0f172a", fontSize: "14px", fontWeight: 800, marginBottom: "3px" }}>
            Randomizador
          </div>
          <div style={{ color: "#64748b", fontSize: "10px", lineHeight: 1.35 }}>
            Divida o fluxo em ramificações aleatórias. Clique para editar.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "7px" }}>
        {branches.map((branch, index) => (
          <div
            key={branch.id}
            style={{
              position: "relative",
              minHeight: "32px",
              border: "1px solid #e2e8f0",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              background: "#ffffff",
              color: "#0f172a",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <span>{branch.label || getBranchLabel(index)}</span>
            <span>{branch.percent}%</span>
            <Handle
              type="source"
              position="right"
              id={branch.id}
              style={{
                background: branch.color,
                width: "10px",
                height: "10px",
                right: "-18px",
                top: "50%",
                cursor: "pointer",
                border: "2px solid #ffffff",
                boxShadow: `0 0 0 2px ${branch.color}33`,
              }}
              isConnectable={isConnectable}
            >
              <ArrowForwardIos
                sx={{
                  color: "#ffffff",
                  width: "6px",
                  height: "6px",
                  marginLeft: "1px",
                  pointerEvents: "none",
                }}
              />
            </Handle>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={openEditor}
        style={{
          width: "100%",
          height: "34px",
          border: "1px dashed #93c5fd",
          borderRadius: "5px",
          background: "#ffffff",
          color: "#2563eb",
          marginTop: "8px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
        }}
      >
        <Add sx={{ width: "15px", height: "15px" }} />
        Adicionar ramificação
      </button>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          marginTop: "12px",
          paddingTop: "10px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          textAlign: "center",
          color: "#2563eb",
          fontSize: "9px",
          gap: "6px",
        }}
      >
        <span><strong>0</strong><br />Sucessos</span>
        <span><strong>0</strong><br />Alertas</span>
        <span><strong>0</strong><br />Erros</span>
      </div>
    </div>
  );
});
