/**
 * DSModal — Design System Modal Primitive
 *
 * A centralized, token-aware modal that consumes the AtendZappy design token
 * system via CSS custom properties. All color and visual decisions come from
 * the token layer — no hardcoded values.
 *
 * Provides a consistent pattern for:
 *   - Modal background (--modal-bg)
 *   - Header background, text, and bottom border (--modal-header-*)
 *   - Body/content area background (--modal-body-bg)
 *   - Section title style helper (DSModalSectionTitle)
 *   - Overlay (--modal-overlay)
 *
 * All MUI Dialog props are forwarded, so maxWidth, fullWidth, onClose, etc.
 * continue to work unchanged.
 *
 * Usage:
 *   <DSModal open={open} onClose={onClose} title="Editar Contato" maxWidth="sm">
 *     <DialogContent>...</DialogContent>
 *     <DialogActions>...</DialogActions>
 *   </DSModal>
 *
 * Or without the built-in header (provide your own):
 *   <DSModal open={open} onClose={onClose}>
 *     <DialogTitle>...</DialogTitle>
 *     ...
 *   </DSModal>
 */
import React from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  paper: {
    backgroundColor: "var(--modal-bg)",
    backgroundImage: "none",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-xl)",
  },
  header: {
    backgroundColor: "var(--modal-header-bg)",
    borderBottom: "1px solid var(--modal-header-border)",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "var(--modal-header-text)",
    fontWeight: 600,
    fontSize: "var(--font-size-md)",
    margin: 0,
    flex: 1,
  },
  closeButton: {
    color: "var(--text-secondary)",
    padding: 6,
    marginLeft: 8,
    "&:hover": {
      backgroundColor: "var(--bg-hover)",
      color: "var(--text-primary)",
    },
  },
  body: {
    backgroundColor: "var(--modal-body-bg)",
  },
  backdrop: {
    backgroundColor: "var(--modal-overlay)",
  },
  sectionTitle: {
    color: "var(--modal-section-title)",
    fontWeight: 600,
    fontSize: "var(--font-size-sm)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "var(--space-3)",
    marginTop: "var(--space-4)",
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
  },
}));

/**
 * Main modal wrapper.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {string} [props.title] — if provided, renders a styled header with close button
 * @param {boolean} [props.showCloseButton=true] — show × in header (only when title is set)
 * @param {React.ReactNode} props.children
 * @param {object} rest — MUI Dialog props (maxWidth, fullWidth, disableEscapeKeyDown…)
 */
export const DSModal = ({
  open,
  onClose,
  title,
  showCloseButton = true,
  children,
  ...rest
}) => {
  const classes = useStyles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ className: classes.paper }}
      BackdropProps={{ style: { backgroundColor: "var(--modal-overlay)" } }}
      {...rest}
    >
      {title !== undefined && (
        <div className={classes.header}>
          <Typography component="h2" className={classes.headerTitle}>
            {title}
          </Typography>
          {showCloseButton && onClose && (
            <IconButton
              aria-label="fechar"
              className={classes.closeButton}
              onClick={onClose}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </div>
      )}
      <div className={classes.body}>{children}</div>
    </Dialog>
  );
};

/**
 * Section title helper — use inside modal body to group fields visually.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.icon] — optional leading icon
 * @param {React.ReactNode} props.children
 */
export const DSModalSectionTitle = ({ icon, children }) => {
  const classes = useStyles();
  return (
    <Typography component="div" className={classes.sectionTitle}>
      {icon && icon}
      {children}
    </Typography>
  );
};

export default DSModal;
