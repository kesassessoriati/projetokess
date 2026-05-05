import React, { useEffect, useState } from "react";

import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddIcon from "@material-ui/icons/Add";
import { Slider } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

import { i18n } from "../../translate/i18n";

const BRANCH_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
const MAX_BRANCHES = 6;

const getBranchLabel = index => String.fromCharCode(65 + index);

const distributeBranches = count => {
  const base = Math.floor(100 / count);
  let remaining = 100 - base * count;

  return Array.from({ length: count }, (_, index) => ({
    id: getBranchLabel(index).toLowerCase(),
    label: getBranchLabel(index),
    percent: base + (remaining-- > 0 ? 1 : 0),
    color: BRANCH_COLORS[index % BRANCH_COLORS.length],
  }));
};

const normalizeBranches = nodeData => {
  const rawBranches = nodeData?.branches;

  if (Array.isArray(rawBranches) && rawBranches.length >= 2) {
    return rawBranches.slice(0, MAX_BRANCHES).map((branch, index) => ({
      id: branch.id || getBranchLabel(index).toLowerCase(),
      label: branch.label || getBranchLabel(index),
      percent: Number(branch.percent) || 0,
      color: branch.color || BRANCH_COLORS[index % BRANCH_COLORS.length],
    }));
  }

  const percent = Number(nodeData?.percent);
  const percentA = Number.isFinite(percent) && percent > 0 ? Math.min(percent, 100) : 50;

  return [
    { id: "a", label: "A", percent: percentA, color: BRANCH_COLORS[0] },
    { id: "b", label: "B", percent: 100 - percentA, color: BRANCH_COLORS[1] },
  ];
};

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  content: {
    padding: theme.spacing(2, 2, 1),
  },
  intro: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: theme.spacing(2),
  },
  branchRow: {
    display: "grid",
    gridTemplateColumns: "22px 1fr 72px 36px",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  branchLabel: {
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 14,
  },
  percentInput: {
    "& input": {
      textAlign: "center",
      padding: "8px 6px",
    },
  },
  addButton: {
    border: "1px dashed #bfdbfe",
    color: "#2563eb",
    textTransform: "none",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  total: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: theme.spacing(1.5),
    color: "#64748b",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
  },
  totalError: {
    color: "#dc2626",
    fontWeight: 700,
  },
  totalOk: {
    color: "#16a34a",
    fontWeight: 700,
  },
  btnWrapper: {
    position: "relative",
  },
}));

const FlowBuilderRandomizerModal = ({
  open,
  onSave,
  data,
  onUpdate,
  close,
}) => {
  const classes = useStyles();
  const [branches, setBranches] = useState(distributeBranches(3));
  const [activeModal, setActiveModal] = useState(false);

  useEffect(() => {
    if (open === "edit") {
      setBranches(normalizeBranches(data?.data));
      setActiveModal(true);
    } else if (open === "create") {
      setBranches(distributeBranches(3));
      setActiveModal(true);
    }
  }, [open, data]);

  const totalPercent = branches.reduce((sum, branch) => sum + Number(branch.percent || 0), 0);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const updateBranchPercent = (index, value) => {
    const nextValue = Math.max(0, Math.min(100, Number(value) || 0));
    setBranches(prev =>
      prev.map((branch, branchIndex) =>
        branchIndex === index ? { ...branch, percent: nextValue } : branch
      )
    );
  };

  const addBranch = () => {
    const nextCount = Math.min(branches.length + 1, MAX_BRANCHES);
    setBranches(distributeBranches(nextCount));
  };

  const removeBranch = () => {
    if (branches.length <= 2) return;
    setBranches(distributeBranches(branches.length - 1).map((branch, branchIndex) => ({
      ...branch,
      color: BRANCH_COLORS[branchIndex % BRANCH_COLORS.length],
    })));
  };

  const handleSave = () => {
    if (branches.length < 2) {
      return toast.error("Adicione pelo menos duas ramificações");
    }

    if (totalPercent !== 100) {
      return toast.error("A soma das ramificações precisa ser 100%");
    }

    const nextBranches = branches.map((branch, index) => ({
      id: getBranchLabel(index).toLowerCase(),
      label: getBranchLabel(index),
      percent: Number(branch.percent),
      color: BRANCH_COLORS[index % BRANCH_COLORS.length],
    }));

    const payload = {
      percent: nextBranches[0].percent,
      branches: nextBranches,
    };

    if (open === "edit") {
      onUpdate({
        ...data,
        data: {
          ...(data?.data || {}),
          ...payload,
        },
      });
    } else if (open === "create") {
      onSave(payload);
    }

    handleClose();
  };

  return (
    <div className={classes.root}>
      <Dialog open={activeModal} onClose={handleClose} fullWidth maxWidth="xs" scroll="paper">
        <DialogTitle id="form-dialog-title">
          {open === "create" ? "Adicionar randomizador" : "Editar randomizador"}
        </DialogTitle>
        <DialogContent dividers className={classes.content}>
          <Typography className={classes.intro}>
            Modifique as ramificações e seus percentuais.
          </Typography>

          {branches.map((branch, index) => (
            <div className={classes.branchRow} key={branch.id}>
              <Typography className={classes.branchLabel}>{getBranchLabel(index)}</Typography>
              <Slider
                value={Number(branch.percent) || 0}
                min={0}
                max={100}
                step={1}
                onChange={(_, value) => updateBranchPercent(index, value)}
                sx={{
                  color: branch.color,
                  "& .MuiSlider-rail": { color: "#cbd5e1" },
                }}
              />
              <TextField
                className={classes.percentInput}
                variant="outlined"
                size="small"
                value={branch.percent}
                type="number"
                inputProps={{ min: 0, max: 100 }}
                onChange={event => updateBranchPercent(index, event.target.value)}
                InputProps={{ endAdornment: <span>%</span> }}
              />
              <IconButton
                size="small"
                disabled={branches.length <= 2}
                onClick={removeBranch}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </div>
          ))}

          <Button
            fullWidth
            className={classes.addButton}
            startIcon={<AddIcon />}
            disabled={branches.length >= MAX_BRANCHES}
            onClick={addBranch}
          >
            Adicionar ramificação
          </Button>

          <div className={classes.total}>
            <span>Total configurado</span>
            <span className={totalPercent === 100 ? classes.totalOk : classes.totalError}>
              {totalPercent}%
            </span>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<CancelIcon />}
            onClick={handleClose}
            style={{
              color: "white",
              backgroundColor: "#db6565",
              boxShadow: "none",
              borderRadius: 0,
              fontSize: "12px",
            }}
            variant="outlined"
          >
            {i18n.t("contactModal.buttons.cancel")}
          </Button>
          <Button
            startIcon={<SaveIcon />}
            type="button"
            style={{
              color: "white",
              backgroundColor: "#437db5",
              boxShadow: "none",
              borderRadius: 0,
              fontSize: "12px",
            }}
            variant="contained"
            className={classes.btnWrapper}
            onClick={handleSave}
          >
            {open === "create" ? "Adicionar" : "Editar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FlowBuilderRandomizerModal;
