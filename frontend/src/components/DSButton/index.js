/**
 * DSButton — Design System Button Primitive
 *
 * A centralized, token-aware button that consumes the AtendZappy design token
 * system via CSS custom properties. All color and visual decisions come from
 * the token layer — no hardcoded values.
 *
 * Variants:
 *   primary     — filled, uses --color-primary (admin-configurable)
 *   secondary   — outlined, uses --btn-secondary-* tokens
 *   destructive — filled red, uses --btn-destructive-* tokens (cancel/delete)
 *   neutral     — subtle gray, uses --btn-neutral-* tokens (close/back)
 *
 * This component wraps MUI Button so all MUI props (startIcon, disabled,
 * onClick, fullWidth, size, etc.) continue to work unchanged.
 *
 * Usage:
 *   <DSButton variant="primary" onClick={...}>Salvar</DSButton>
 *   <DSButton variant="destructive" startIcon={<CancelIcon />}>Cancelar</DSButton>
 *   <DSButton variant="neutral" onClick={onClose}>Fechar</DSButton>
 */
import React from "react";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  // ── Primary ──────────────────────────────────────────────────────────────
  // Uses --btn-primary-bg which is independently configurable from the general
  // brand/system color (--color-primary). Falls back to --color-primary when
  // no dedicated button color is set via White Label settings.
  primary: {
    backgroundColor: "var(--btn-primary-bg, var(--color-primary))",
    color: "var(--btn-primary-text)",
    boxShadow: "none",
    borderRadius: "var(--radius-sm)",
    "&:hover": {
      backgroundColor: "var(--btn-primary-bg, var(--color-primary))",
      filter: "brightness(0.88)",
      boxShadow: "none",
    },
    "&:active": {
      filter: "brightness(0.78)",
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      backgroundColor: "var(--btn-primary-bg, var(--color-primary))",
      color: "var(--btn-primary-text)",
      opacity: 0.5,
    },
  },

  // ── Secondary ─────────────────────────────────────────────────────────────
  secondary: {
    backgroundColor: "var(--btn-secondary-bg)",
    color: "var(--btn-secondary-text)",
    border: "1px solid var(--btn-secondary-border)",
    boxShadow: "none",
    borderRadius: "var(--radius-sm)",
    "&:hover": {
      backgroundColor: "var(--btn-secondary-hover-bg)",
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      opacity: 0.5,
    },
  },

  // ── Destructive ───────────────────────────────────────────────────────────
  destructive: {
    backgroundColor: "var(--btn-destructive-bg)",
    color: "var(--btn-destructive-text)",
    boxShadow: "none",
    borderRadius: "var(--radius-sm)",
    "&:hover": {
      backgroundColor: "var(--btn-destructive-hover-bg)",
      boxShadow: "none",
    },
    "&:active": {
      filter: "brightness(0.9)",
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      backgroundColor: "var(--btn-destructive-bg)",
      color: "var(--btn-destructive-text)",
      opacity: 0.5,
    },
  },

  // ── Neutral ───────────────────────────────────────────────────────────────
  neutral: {
    backgroundColor: "var(--btn-neutral-bg)",
    color: "var(--btn-neutral-text)",
    boxShadow: "none",
    borderRadius: "var(--radius-sm)",
    "&:hover": {
      backgroundColor: "var(--btn-neutral-hover-bg)",
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      opacity: 0.5,
    },
  },

  // ── Spinner wrapper ───────────────────────────────────────────────────────
  root: {
    position: "relative",
  },
  spinner: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
    color: "inherit",
  },
}));

/**
 * @param {object} props
 * @param {"primary"|"secondary"|"destructive"|"neutral"} [props.variant="primary"]
 * @param {boolean} [props.loading=false] — shows a spinner and disables the button
 * @param {React.ReactNode} props.children
 * @param {object} rest — all MUI Button props (startIcon, onClick, fullWidth, size…)
 */
const DSButton = ({ variant = "primary", loading = false, children, className = "", ...rest }) => {
  const classes = useStyles();

  // Map DS variant → MUI variant
  const muiVariant = variant === "secondary" ? "outlined" : "contained";
  const variantClass = classes[variant] || classes.primary;

  return (
    <Button
      variant={muiVariant}
      className={`${classes.root} ${variantClass} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {children}
      {loading && <CircularProgress size={24} className={classes.spinner} />}
    </Button>
  );
};

export default DSButton;
