import React, { useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { makeStyles, IconButton, Tooltip } from "@material-ui/core";
import { Phone as PhoneIcon } from "@material-ui/icons";
import { useWebphone } from "../../context/WebphoneContext";
import { usePlanPermissions } from "../../context/PlanPermissionsContext";
import WebphoneWorkspace from "../WebphoneWorkspace";

const PANEL_WIDTH = 380;

const getInitialPosition = () => {
  try {
    const saved = localStorage.getItem("webphone_float_pos");
    if (saved) {
      const pos = JSON.parse(saved);
      return {
        x: Math.min(Math.max(0, pos.x), window.innerWidth - PANEL_WIDTH),
        y: Math.min(Math.max(0, pos.y), window.innerHeight - 100),
      };
    }
  } catch (_) {}
  return {
    x: window.innerWidth - PANEL_WIDTH - 24,
    y: Math.max(24, window.innerHeight - 620),
  };
};

const useStyles = makeStyles(() => ({
  floatingPanel: {
    position: "fixed",
    width: PANEL_WIDTH,
    maxWidth: "calc(100vw - 16px)",
    zIndex: 1400,
    borderRadius: 16,
    boxShadow:
      "0 24px 48px rgba(15, 23, 42, 0.22), 0 8px 16px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    border: "1px solid #d8e4db",
    backgroundColor: "#fff",
  },
  dragHandle: {
    height: 10,
    background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    cursor: "grab",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    "&::before": {
      content: '""',
      display: "block",
      width: 36,
      height: 3,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.35)",
    },
  },
  restoreButton: {
    position: "fixed",
    right: 20,
    bottom: 26,
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    color: "#fff",
    zIndex: 1400,
    boxShadow: "0 18px 32px rgba(15, 23, 42, 0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
    "&:hover": {
      background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
    },
  },
}));

const WebphoneSidePanel = () => {
  const classes = useStyles();
  const { webphone: canUseWebphone } = usePlanPermissions();
  const { panelOpen, panelMinimized, leadModalOpen, setPanelOpen, minimizePanel, restorePanel } = useWebphone();
  const [position, setPosition] = useState(getInitialPosition);
  const positionRef = useRef(position);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Keep ref in sync for use inside event listeners (avoids stale closures)
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleDragStart = (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const x = Math.min(
        Math.max(0, e.clientX - dragOffset.current.x),
        window.innerWidth - PANEL_WIDTH
      );
      const y = Math.min(
        Math.max(0, e.clientY - dragOffset.current.y),
        window.innerHeight - 60
      );
      setPosition({ x, y });
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(
          "webphone_float_pos",
          JSON.stringify(positionRef.current)
        );
      } catch (_) {}
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (!canUseWebphone || !panelOpen) return null;

  return ReactDOM.createPortal(
    <>
      {!panelMinimized && (
        <div
          className={classes.floatingPanel}
          style={{ left: position.x, top: position.y }}
        >
          <div className={classes.dragHandle} onMouseDown={handleDragStart} />
          <WebphoneWorkspace
            closable
            allowMinimize
            onMinimize={() => minimizePanel("manual")}
            onClose={() => setPanelOpen(false)}
          />
        </div>
      )}

      {panelMinimized && !leadModalOpen && (
        <Tooltip title="Restaurar webphone">
          <IconButton className={classes.restoreButton} onClick={restorePanel}>
            <PhoneIcon />
          </IconButton>
        </Tooltip>
      )}
    </>,
    document.body
  );
};

export default WebphoneSidePanel;
