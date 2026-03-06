import React, { useState, useEffect, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Popover,
  Grid,
  useMediaQuery,
  useTheme,
  IconButton,
  Zoom
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import ColorizeIcon from "@material-ui/icons/Colorize";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    borderRadius: "12px",
    background: "#1E1E1E",
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    width: "100%",
    [theme.breakpoints.up('sm')]: {
      minWidth: "450px",
      maxWidth: "500px",
    },
    [theme.breakpoints.down('sm')]: {
      width: "90%",
      margin: "0 auto",
    },
  },
  dialogTitle: {
    background: "#111",
    color: "#fff",
    padding: "16px 20px",
    borderBottom: "1px solid #2A2A2A",
    "& h2": {
      fontSize: "1.1rem",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      fontFamily: "Inter, sans-serif"
    }
  },
  closeButton: {
    color: "#999",
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    padding: 0,
    transition: "all 0.2s",
    "&:hover": {
      backgroundColor: "#2A2A2A",
      color: "#fff",
    }
  },
  dialogContent: {
    padding: "24px 20px",
    background: "#1E1E1E",
  },
  dialogActions: {
    padding: "16px 20px",
    background: "#1E1E1E",
    borderTop: "1px solid #2A2A2A",
    display: "flex",
    gap: "12px",
    justifyContent: "space-between",
  },
  inputField: {
    marginBottom: "16px",
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      backgroundColor: "#2A2A2A",
      color: "#fff",
      "& fieldset": {
        borderColor: "#333",
      },
      "&:hover fieldset": {
        borderColor: "#555",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#888",
        borderWidth: "1px",
      },
      "& input": {
        color: "#fff"
      }
    },
    "& .MuiInputLabel-root": {
      color: "#aaa",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#fff",
    },
    "& .MuiSelect-icon": {
      color: "#aaa",
    }
  },
  colorAdorment: {
    width: 24,
    height: 24,
    borderRadius: "4px",
    border: "1px solid #444",
  },
  cancelButton: {
    background: "#2A2A2A",
    color: "#ff4d4f",
    border: "1px solid #ff4d4f20",
    borderRadius: "8px",
    padding: "8px 24px",
    textTransform: "none",
    fontWeight: 500,
    boxShadow: "none",
    "&:hover": {
      background: "#333",
      border: "1px solid #ff4d4f40",
      boxShadow: "none",
    }
  },
  saveButton: {
    background: "#111",
    color: "white",
    borderRadius: "8px",
    padding: "8px 24px",
    textTransform: "none",
    fontWeight: 500,
    border: "1px solid #222",
    boxShadow: "none",
    "&:hover": {
      background: "#222",
      boxShadow: "none",
    }
  },
  previewContainer: {
    marginTop: "8px",
    marginBottom: "24px",
    padding: "16px",
    background: "#111",
    borderRadius: "8px",
    border: "1px solid #2A2A2A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "12px"
  },
  previewText: {
    color: "#777",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  previewTag: {
    padding: "6px 16px",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 500,
    fontSize: "0.95rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    display: "inline-block",
    transition: "all 0.3s ease"
  },
  colorPickerContainer: {
    padding: "16px",
    backgroundColor: "#2A2A2A",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "250px"
  },
  colorPickerPopover: {
    "& .MuiPaper-root": {
      backgroundColor: "transparent",
      boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
      borderRadius: "12px",
      marginTop: "8px",
      border: "1px solid #333"
    }
  },
  colorPalette: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  colorBox: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.1)",
    transition: "transform 0.1s",
    "&:hover": {
      transform: "scale(1.15)",
      zIndex: 2,
    }
  },
  hexInput: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#1E1E1E",
      borderRadius: "6px",
      color: "#fff",
      height: "40px",
      "& fieldset": { borderColor: "#444" },
      "&:hover fieldset": { borderColor: "#666" },
      "&.Mui-focused fieldset": { borderColor: "#888" },
      "& input": { color: "#fff" }
    }
  },
  kanbanTitle: {
    fontSize: "0.9rem",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "16px",
    marginTop: "8px",
    borderBottom: "1px solid #333",
    paddingBottom: "8px",
    fontWeight: 500
  },
  menuPaper: {
    backgroundColor: "#2A2A2A",
    color: "#fff",
    border: "1px solid #333",
    "& .MuiMenuItem-root": {
      "&:hover": {
        backgroundColor: "#333",
      },
      "&.Mui-selected": {
        backgroundColor: "#111",
        "&:hover": {
          backgroundColor: "#333",
        }
      }
    }
  }
}));

const TagSchema = Yup.object().shape({
  name: Yup.string()
    .min(3, "Mensagem muito curta")
    .required("Obrigatório"),
});

const DEFAULT_COLORS = [
  "#FF4D4F", "#FF7A45", "#FFA940", "#FADB14", "#8CE600",
  "#52C41A", "#13C2C2", "#1677FF", "#2F54EB", "#722ED1",
  "#EB2F96", "#E02020", "#FA8C16", "#F5222D", "#1890FF",
  "#667EEA", "#764BA2", "#9F7AEA", "#5F72BE", "#D4A5A5"
];

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} timeout={200} />;
});

const TagModal = ({ open, onClose, tagId, kanban }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [colorAnchorEl, setColorAnchorEl] = useState(null);
  const [lanes, setLanes] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [selectedRollbackLane, setSelectedRollbackLane] = useState("");

  const initialState = {
    name: "",
    color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
    kanban: kanban,
    timeLane: 0,
    nextLaneId: 0,
    greetingMessageLane: "",
    rollbackLaneId: 0,
  };
  const [tag, setTag] = useState(initialState);
  const [hexInput, setHexInput] = useState(initialState.color);

  useEffect(() => {
    let unmounted = false;
    const fetchTags = async () => {
      try {
        const { data } = await api.get("/tags/", {
          params: { kanban: 1, tagId },
        });
        if (!unmounted) {
          setLanes(data.tags);
        }
      } catch (err) {
        toastError(err);
      }
    };
    if (open) {
      setTimeout(fetchTags, 50);
    }
    return () => { unmounted = true; };
  }, [open, tagId]);

  useEffect(() => {
    try {
      (async () => {
        if (!tagId) return;
        const { data } = await api.get(`/tags/${tagId}`);
        setTag((prevState) => {
          return { ...prevState, ...data };
        });
        setHexInput(data.color);
        if (data.nextLaneId) setSelectedLane(data.nextLaneId);
        if (data.rollbackLaneId) setSelectedRollbackLane(data.rollbackLaneId);
      })();
    } catch (err) {
      toastError(err);
    }
  }, [tagId, open]);

  const handleClose = () => {
    setTag(initialState);
    setColorAnchorEl(null);
    setSelectedLane("");
    setSelectedRollbackLane("");
    setHexInput(initialState.color);
    onClose();
  };

  const handleSaveTag = async (values) => {
    const tagData = {
      ...values,
      userId: user?.id,
      kanban: kanban,
      nextLaneId: selectedLane || null,
      rollbackLaneId: selectedRollbackLane || null,
    };
    try {
      if (tagId) {
        await api.put(`/tags/${tagId}`, tagData);
      } else {
        await api.post("/tags", tagData);
      }
      toast.success(
        kanban === 0
          ? `${i18n.t("tagModal.success")}`
          : `${i18n.t("tagModal.successKanban")}`
      );
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const handleColorClick = (event) => {
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchorEl(null);
  };

  const handleColorSelect = (color, setFieldValue) => {
    setFieldValue("color", color);
    setHexInput(color);
  };

  const handleHexInputChange = (e, setFieldValue) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      setFieldValue("color", val);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      disableBackdropClick
      disableEscapeKeyDown
      classes={{ paper: classes.dialogPaper }}
      TransitionComponent={Transition}
      keepMounted={false}
    >
      <DialogTitle className={classes.dialogTitle} disableTypography>
        <Typography variant="h2">
          {tagId
            ? kanban === 0
              ? `${i18n.t("tagModal.title.edit")}`
              : `${i18n.t("tagModal.title.editKanban")}`
            : kanban === 0
              ? `${i18n.t("tagModal.title.add")}`
              : `${i18n.t("tagModal.title.addKanban")}`}
        </Typography>
        <IconButton className={classes.closeButton} onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Formik
        initialValues={tag}
        enableReinitialize={true}
        validationSchema={TagSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveTag(values);
            actions.setSubmitting(false);
          }, 400);
        }}
      >
        {({ touched, errors, isSubmitting, values, setFieldValue }) => (
          <Form>
            <DialogContent className={classes.dialogContent}>

              <Field
                as={TextField}
                label={i18n.t("tagModal.form.name")}
                name="name"
                error={touched.name && Boolean(errors.name)}
                helperText={touched.name && errors.name}
                variant="outlined"
                margin="dense"
                fullWidth
                className={classes.inputField}
              />

              <Field
                as={TextField}
                fullWidth
                label={i18n.t("tagModal.form.color")}
                name="color"
                id="color"
                error={touched.color && Boolean(errors.color)}
                helperText={touched.color && errors.color}
                className={classes.inputField}
                value={values.color}
                onChange={(e) => {
                  setFieldValue('color', e.target.value);
                  setHexInput(e.target.value);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <div
                        style={{ backgroundColor: values.color }}
                        className={classes.colorAdorment}
                      ></div>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={handleColorClick}
                      style={{ color: "#aaa" }}
                    >
                      <ColorizeIcon />
                    </IconButton>
                  ),
                }}
                variant="outlined"
                margin="dense"
              />

              <Popover
                open={Boolean(colorAnchorEl)}
                anchorEl={colorAnchorEl}
                onClose={handleColorClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                className={classes.colorPickerPopover}
              >
                <div className={classes.colorPickerContainer}>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e, setFieldValue)}
                    className={classes.hexInput}
                    placeholder="#FFFFFF"
                  />
                  <div className={classes.colorPalette}>
                    {DEFAULT_COLORS.map(c => (
                      <div
                        key={c}
                        className={classes.colorBox}
                        style={{ backgroundColor: c, border: c === values.color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)" }}
                        onClick={() => handleColorSelect(c, setFieldValue)}
                      />
                    ))}
                  </div>
                </div>
              </Popover>

              <div className={classes.previewContainer}>
                <Typography className={classes.previewText}>Preview</Typography>
                <div
                  className={classes.previewTag}
                  style={{ backgroundColor: values.color || "#333" }}
                >
                  {values.name || "Nome da Tag"}
                </div>
              </div>

              {kanban === 1 && (
                <>
                  <Typography className={classes.kanbanTitle}>
                    Configurações Kanban
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Field
                        as={TextField}
                        label={i18n.t("tagModal.form.timeLane")}
                        name="timeLane"
                        error={touched.timeLane && Boolean(errors.timeLane)}
                        helperText={touched.timeLane && errors.timeLane}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        className={classes.inputField}
                        type="number"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        className={classes.inputField}
                      >
                        <InputLabel id="nextLaneId-label">
                          {i18n.t("tagModal.form.nextLaneId")}
                        </InputLabel>
                        <Field
                          as={Select}
                          label={i18n.t("tagModal.form.nextLaneId")}
                          labelId="nextLaneId-label"
                          id="nextLaneId"
                          name="nextLaneId"
                          error={touched.nextLaneId && Boolean(errors.nextLaneId)}
                          value={selectedLane}
                          onChange={(e) => setSelectedLane(e.target.value)}
                          MenuProps={{ classes: { paper: classes.menuPaper } }}
                        >
                          <MenuItem value="">&nbsp;</MenuItem>
                          {lanes.map((lane) => (
                            <MenuItem key={lane.id} value={lane.id}>
                              {lane.name}
                            </MenuItem>
                          ))}
                        </Field>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Field
                        as={TextField}
                        label={i18n.t("tagModal.form.greetingMessageLane")}
                        name="greetingMessageLane"
                        rows={3}
                        multiline
                        error={
                          touched.greetingMessageLane &&
                          Boolean(errors.greetingMessageLane)
                        }
                        helperText={
                          touched.greetingMessageLane && errors.greetingMessageLane
                        }
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        className={classes.inputField}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <FormControl
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        className={classes.inputField}
                      >
                        <InputLabel id="rollbackLaneId-label">
                          {i18n.t("tagModal.form.rollbackLaneId")}
                        </InputLabel>
                        <Field
                          as={Select}
                          label={i18n.t("tagModal.form.rollbackLaneId")}
                          labelId="rollbackLaneId-label"
                          id="rollbackLaneId"
                          name="rollbackLaneId"
                          error={
                            touched.rollbackLaneId && Boolean(errors.rollbackLaneId)
                          }
                          value={selectedRollbackLane}
                          onChange={(e) => setSelectedRollbackLane(e.target.value)}
                          MenuProps={{ classes: { paper: classes.menuPaper } }}
                        >
                          <MenuItem value="">&nbsp;</MenuItem>
                          {lanes.map((lane) => (
                            <MenuItem key={lane.id} value={lane.id}>
                              {lane.name}
                            </MenuItem>
                          ))}
                        </Field>
                      </FormControl>
                    </Grid>
                  </Grid>
                </>
              )}
            </DialogContent>

            <DialogActions className={classes.dialogActions}>
              <Button
                onClick={handleClose}
                className={classes.cancelButton}
                disabled={isSubmitting}
                variant="outlined"
              >
                {i18n.t("tagModal.buttons.cancel")}
              </Button>

              <Button
                type="submit"
                className={classes.saveButton}
                disabled={isSubmitting}
                variant="contained"
              >
                {tagId
                  ? `${i18n.t("tagModal.buttons.okEdit")}`
                  : `Criar Tag`}
                {isSubmitting && (
                  <CircularProgress
                    size={24}
                    style={{ position: 'absolute', color: '#fff' }}
                  />
                )}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default TagModal;