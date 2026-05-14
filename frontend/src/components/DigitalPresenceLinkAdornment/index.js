import React from "react";
import { IconButton, InputAdornment, Tooltip } from "@material-ui/core";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

const normalizeUrl = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const DigitalPresenceLinkAdornment = ({ value, label = "Abrir link" }) => {
  const href = normalizeUrl(value);

  if (!href) return null;

  return (
    <InputAdornment position="end">
      <Tooltip title={label}>
        <IconButton
          edge="end"
          size="small"
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );
};

export default DigitalPresenceLinkAdornment;
