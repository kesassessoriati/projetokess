import React, { useState } from "react";
import { getBezierPath, getEdgeCenter, getMarkerEnd } from "react-flow-renderer";
import "./css/buttonedge.css";
import { Delete } from "@mui/icons-material";

const onEdgeClick = (evt, id) => {
  evt.stopPropagation();
  window.dispatchEvent(new CustomEvent("flowbuilder:delete-edge", { detail: { id } }));
};

// Edge custom: a lixeira só aparece no hover (estilo n8n). A remoção por
// seleção + tecla Delete continua funcionando normalmente (comportamento
// padrão do React Flow).
export default function RemoveEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  arrowHeadType,
  markerEndId,
}) {
  const [hovered, setHovered] = useState(false);

  const edgePath = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY });
  const foreignObjectSize = 28;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
      {/* Trilho invisível mais largo para facilitar o hover sobre o laço */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ pointerEvents: "stroke" }}
      />
      {hovered && (
        <foreignObject
          width={foreignObjectSize}
          height={foreignObjectSize}
          x={edgeCenterX - foreignObjectSize / 2}
          y={edgeCenterY - foreignObjectSize / 2}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            className="edgebutton"
            onClick={(evt) => onEdgeClick(evt, id)}
            title="Remover conexão"
          >
            <Delete style={{ width: "12px", height: "12px", color: "#ef4444", display: "block" }} />
          </div>
        </foreignObject>
      )}
    </g>
  );
}
