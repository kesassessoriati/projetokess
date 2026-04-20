import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { Delete, StickyNote2 } from "@mui/icons-material";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || "Clique duas vezes para editar...");
  const textareaRef = useRef(null);

  useEffect(() => {
    setText(data.text || "Clique duas vezes para editar...");
  }, [data.text]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (data.onTextChange) data.onTextChange(id, text);
  }, [id, text, data]);

  const noteColor = data.color || "#fef9c3";
  const borderColor = data.color ? data.color + "aa" : "#fde047";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      style={{
        backgroundColor: noteColor,
        padding: "16px",
        borderRadius: "4px",
        minWidth: "200px",
        maxWidth: "320px",
        width: data.width || "220px",
        minHeight: "120px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: `2px solid ${borderColor}`,
        boxShadow: isHovered
          ? "0 8px 24px rgba(0,0,0,0.15), 4px 4px 0 rgba(0,0,0,0.08)"
          : "4px 4px 0 rgba(0,0,0,0.06)",
        transition: "all 0.2s ease",
        transform: isHovered ? "translateY(-2px) rotate(-0.5deg)" : "translateY(0) rotate(0deg)",
        cursor: isEditing ? "text" : "grab",
        userSelect: isEditing ? "text" : "none",
      }}
    >
      {/* Top tape decoration */}
      <div style={{
        position: "absolute",
        top: -10,
        left: "50%",
        transform: "translateX(-50%)",
        width: 40,
        height: 12,
        background: "rgba(253,224,71,0.6)",
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 6 }}>
        <StickyNote2 sx={{ fontSize: 16, color: "#a16207" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#a16207", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Nota
        </span>
      </div>

      {/* Delete button */}
      <div
        onClick={(e) => { e.stopPropagation(); storageItems.setNodesStorage(id); storageItems.setAct("delete"); }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <Delete sx={{ fontSize: 14, color: "#ef4444" }} />
      </div>

      {/* Text content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            minHeight: "80px",
            border: "none",
            background: "transparent",
            resize: "none",
            outline: "none",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: "#713f12",
            lineHeight: 1.5,
            cursor: "text",
          }}
        />
      ) : (
        <div style={{
          fontSize: 13,
          color: "#713f12",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          minHeight: 60,
          opacity: text === "Clique duas vezes para editar..." ? 0.5 : 1,
          fontStyle: text === "Clique duas vezes para editar..." ? "italic" : "normal",
        }}>
          {text}
        </div>
      )}

      {/* Color picker dots */}
      {isHovered && (
        <div style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
          {["#fef9c3", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff"].map((c) => (
            <div
              key={c}
              onClick={(e) => { e.stopPropagation(); if (data.onColorChange) data.onColorChange(id, c); }}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: c,
                border: `2px solid ${data.color === c ? "#374151" : "rgba(0,0,0,0.2)"}`,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
