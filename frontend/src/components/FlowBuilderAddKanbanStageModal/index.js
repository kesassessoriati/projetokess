import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { Stack, Chip, Typography } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { flowBuilderSelectMenuProps } from "../../utils/flowBuilderMenuProps";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: "100%"
  },
  btnWrapper: {
    position: "relative"
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12
  }
}));

const FlowBuilderAddKanbanStageModal = ({
  open,
  onSave,
  data,
  onUpdate,
  close
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const [activeModal, setActiveModal] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [stages, setStages] = useState([]);

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const { data: pipelinesData } = await api.get("/pipelines");
          setPipelines(pipelinesData || []);
          
          if (data?.data?.pipelineId) {
            setSelectedPipeline(data.data.pipelineId);
            const pipeline = pipelinesData.find(p => p.id === data.data.pipelineId);
            if (pipeline) {
              setStages(pipeline.stages || []);
              if (data?.data?.stageId) {
                setSelectedStage(data.data.stageId);
              }
            }
          } else if (data?.data?.id) {
             // Fallback para quando o id era o stageId
             setSelectedStage(data.data.id);
          }
          
          setActiveModal(true);
        } catch (error) {
          console.log(error);
          toast.error("Erro ao carregar pipelines");
        }
      })();
    }
    return () => {
      isMounted.current = false;
    };
  }, [open, data]);

  const handlePipelineChange = (e) => {
    const pipelineId = e.target.value;
    setSelectedPipeline(pipelineId);
    setSelectedStage("");
    const pipeline = pipelines.find(p => p.id === pipelineId);
    setStages(pipeline?.stages || []);
  };

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const handleSave = () => {
    if (!selectedPipeline) {
      return toast.error('Selecione um pipeline');
    }
    if (!selectedStage) {
      return toast.error('Selecione um estágio');
    }

    const pipeline = pipelines.find(p => p.id === selectedPipeline);
    const stage = stages.find(s => s.id === selectedStage);

    const nodeData = {
      pipelineId: selectedPipeline,
      pipelineName: pipeline?.name,
      stageId: selectedStage,
      stageName: stage?.name,
      color: stage?.color || "#999"
    };

    if (open === 'edit') {
      onUpdate({
        ...data,
        data: nodeData
      });
    } else if (open === 'create') {
      onSave({
        data: nodeData
      });
    }
    handleClose();
  };

  return (
    <div className={classes.root}>
      <Dialog open={activeModal} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle id="form-dialog-title">
          {open === 'create' ? `Mover para Estágio Kanban` : `Editar Estágio Kanban`}
        </DialogTitle>
        <Stack spacing={3} sx={{ p: 2 }}>
          <DialogContent dividers>
            <FormControl className={classes.formControl}>
              <InputLabel id="pipeline-select-label">Pipeline</InputLabel>
              <Select
                labelId="pipeline-select-label"
                id="pipeline-select"
                value={selectedPipeline}
                style={{ width: "100%" }}
                onChange={handlePipelineChange}
                displayEmpty
                MenuProps={flowBuilderSelectMenuProps}
              >
                <MenuItem value="" disabled>
                  Selecione um pipeline
                </MenuItem>
                {pipelines.map((pipeline) => (
                  <MenuItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl className={classes.formControl} disabled={!selectedPipeline}>
              <InputLabel id="stage-select-label">Estágio</InputLabel>
              <Select
                labelId="stage-select-label"
                id="stage-select"
                value={selectedStage}
                style={{ width: "100%" }}
                onChange={(e) => setSelectedStage(e.target.value)}
                displayEmpty
                MenuProps={flowBuilderSelectMenuProps}
                renderValue={(selected) => {
                  if (!selected) return "Selecione um estágio";
                  const stage = stages.find(s => s.id === selected);
                  return stage ? (
                    <Chip
                      label={stage.name}
                      size="small"
                      style={{ backgroundColor: stage.color, color: "#fff" }}
                    />
                  ) : "Selecione um estágio";
                }}
              >
                <MenuItem value="" disabled>
                  Selecione um estágio
                </MenuItem>
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    <Chip
                      label={stage.name}
                      size="small"
                      style={{ backgroundColor: stage.color, color: "#fff", marginRight: 8 }}
                    />
                    {stage.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {stages.length === 0 && selectedPipeline && (
               <Typography variant="caption" color="error">
                 Este pipeline não possui estágios configurados.
               </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleClose}
              startIcon={<CancelIcon />}
              style={{
                color: "white",
                backgroundColor: "#db6565",
                boxShadow: "none",
                borderRadius: "8px",
                fontSize: "12px",
                textTransform: "none"
              }}
              variant="contained"
            >
              {i18n.t("contactModal.buttons.cancel")}
            </Button>
            <Button
              startIcon={<SaveIcon />}
              type="submit"
              style={{
                color: "white",
                backgroundColor: "#437db5",
                boxShadow: "none",
                borderRadius: "8px",
                fontSize: "12px",
                textTransform: "none"
              }}
              variant="contained"
              className={classes.btnWrapper}
              onClick={handleSave}
            >
              {open === 'create' ? `Adicionar` : 'Salvar'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </div>
  );
};

export default FlowBuilderAddKanbanStageModal;
