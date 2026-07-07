import React, { useContext, useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import {
  getPreferredWhatsappId,
  sortWhatsappsByUserQueues,
} from "../../utils/whatsappQueuePreference";
import { flowBuilderSelectMenuProps } from "../../utils/flowBuilderMenuProps";

// ─── Trigger catalog ─────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "mensagens",
    label: "Mensagens",
    emoji: "💬",
    triggers: [
      {
        type: "message_received",
        label: "Mensagem recebida",
        description: "Quando uma mensagem é recebida pelo contato",
      },
      {
        type: "ticket_created",
        label: "Atendimento iniciado",
        description: "Quando um novo atendimento é criado",
      },
      {
        type: "ticket_closed",
        label: "Atendimento finalizado",
        description: "Quando um atendimento é encerrado",
      },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    emoji: "👤",
    triggers: [
      {
        type: "lead_created",
        label: "Lead criado",
        description: "Quando um novo lead é criado no CRM",
      },
      {
        type: "lead_updated",
        label: "Lead atualizado",
        description: "Quando os dados de um lead sao atualizados",
      },
      {
        type: "lead_status_changed",
        label: "Status do lead alterado",
        description: "Quando o status comercial de um lead muda",
      },
      {
        type: "lead_converted",
        label: "Lead convertido",
        description: "Quando um lead vira cliente",
      },
      {
        type: "lead_lost",
        label: "Lead perdido",
        description: "Quando um lead e marcado como perdido",
      },
      {
        type: "lead_stage_changed",
        label: "Lead movido",
        description: "Quando um lead muda de etapa no funil",
      },
    ],
  },
  {
    id: "negocios",
    label: "Negócios",
    emoji: "💼",
    triggers: [
      {
        type: "opportunity_created",
        label: "Negócio criado",
        description: "Quando um negócio é criado em uma etapa",
      },
      {
        type: "opportunity_moved",
        label: "Negócio movido",
        description: "Quando um negócio é movido para uma etapa",
      },
      {
        type: "opportunity_updated",
        label: "Negocio atualizado",
        description: "Quando os dados de um negocio sao atualizados",
      },
      {
        type: "opportunity_won",
        label: "Negócio ganho",
        description: "Quando um negócio é marcado como ganho",
      },
      {
        type: "opportunity_lost",
        label: "Negócio perdido",
        description: "Quando um negócio é marcado como perdido",
      },
    ],
  },
  {
    id: "kanban",
    label: "Kanban",
    emoji: "Kanban",
    triggers: [
      {
        type: "move_lead",
        label: "MoveLead",
        description: "Quando um lead e movimentado no Kanban",
      },
      {
        type: "kanban_event",
        label: "Evento do Kanban",
        description: "Quando o Kanban recebe um evento interno mapeado",
      },
    ],
  },
  {
    id: "agendamentos",
    label: "Compromissos",
    emoji: "Agenda",
    triggers: [
      {
        type: "appointment_created",
        label: "Agendamento criado",
        description: "Quando um compromisso e criado na agenda",
      },
      {
        type: "appointment_updated",
        label: "Agendamento atualizado",
        description: "Quando um compromisso e atualizado",
      },
      {
        type: "appointment_cancelled",
        label: "Agendamento cancelado",
        description: "Quando um compromisso e cancelado",
      },
      {
        type: "appointment_completed",
        label: "Agendamento concluido",
        description: "Quando um compromisso e marcado como concluido",
      },
      {
        type: "appointment_rescheduled",
        label: "Agendamento reagendado",
        description: "Quando data ou duracao do compromisso muda",
      },
      {
        type: "reminder_created",
        label: "Lembrete criado",
        description: "Quando um lembrete de agendamento e criado",
      },
      {
        type: "reminder_sent",
        label: "Lembrete enviado",
        description: "Quando um lembrete e enviado ao contato",
      },
      {
        type: "reminder_cancelled",
        label: "Lembrete cancelado",
        description: "Quando um lembrete e cancelado",
      },
    ],
  },
  {
    id: "ligacoes",
    label: "Ligacoes",
    emoji: "Call",
    triggers: [
      {
        type: "call_started",
        label: "Ligacao iniciada",
        description: "Quando uma ligacao e iniciada ou recebida",
      },
      {
        type: "call_answered",
        label: "Ligacao atendida",
        description: "Quando uma ligacao e atendida",
      },
      {
        type: "call_not_answered",
        label: "Ligacao nao atendida",
        description: "Quando uma ligacao nao e atendida",
      },
      {
        type: "call_finished",
        label: "Ligacao finalizada",
        description: "Quando uma ligacao e encerrada",
      },
      {
        type: "call_recorded",
        label: "Ligacao gravada",
        description: "Quando uma gravacao de ligacao e salva",
      },
      {
        type: "call_lost",
        label: "Ligacao perdida",
        description: "Quando uma ligacao e perdida ou falha",
      },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    emoji: "Cliente",
    triggers: [
      {
        type: "client_created",
        label: "Cliente criado",
        description: "Quando um cliente e criado",
      },
      {
        type: "client_updated",
        label: "Cliente atualizado",
        description: "Quando os dados de um cliente sao atualizados",
      },
      {
        type: "client_converted",
        label: "Cliente convertido",
        description: "Quando um cliente e convertido para lead ou negocio",
      },
      {
        type: "client_reactivated",
        label: "Cliente reativado",
        description: "Quando um cliente volta para ativo",
      },
      {
        type: "client_inactivated",
        label: "Cliente inativado",
        description: "Quando um cliente e marcado como inativo",
      },
    ],
  },
  {
    id: "grupos",
    label: "Grupos",
    emoji: "Grupo",
    triggers: [
      {
        type: "group_created",
        label: "Grupo criado",
        description: "Quando um grupo e identificado na sincronizacao",
      },
      {
        type: "group_updated",
        label: "Grupo atualizado",
        description: "Quando dados de um grupo mudam",
      },
      {
        type: "group_removed",
        label: "Grupo removido",
        description: "Quando um grupo deixa de aparecer na conexao",
      },
      {
        type: "group_message_sent",
        label: "Mensagem enviada para grupo",
        description: "Quando uma campanha envia mensagem para grupo",
      },
      {
        type: "group_event_received",
        label: "Evento recebido de grupo",
        description: "Quando uma mensagem ou evento de grupo chega ao CRM",
      },
    ],
  },
  {
    id: "http",
    label: "HTTP",
    emoji: "🌐",
    triggers: [
      {
        type: "http_webhook",
        label: "Requisição HTTP (Webhook)",
        description: "Quando uma requisição HTTP POST é recebida na URL gerada",
      },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    emoji: "⚙️",
    triggers: [
      {
        type: "flow_triggered",
        label: "Iniciado por outra automação",
        description: "Quando esta automação é iniciada por outra automação",
      },
    ],
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 16,
      width: 640,
      maxWidth: "95vw",
      overflow: "hidden",
    },
  },
  dialogTitle: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  layout: {
    display: "flex",
    height: 420,
    overflow: "hidden",
  },
  sidebar: {
    width: 160,
    borderRight: "1px solid #f3f4f6",
    overflowY: "auto",
    padding: "8px 0",
    flexShrink: 0,
  },
  catItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    borderRadius: 8,
    margin: "2px 6px",
    transition: "background 0.15s",
    "&:hover": {
      background: "#f9fafb",
    },
  },
  catItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
    fontWeight: 700,
  },
  triggerList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
  },
  triggerCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    marginBottom: 8,
    transition: "all 0.15s",
    "&:hover": {
      borderColor: "#2563eb",
      background: "#eff6ff",
    },
  },
  triggerCardSelected: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  },
  configPanel: {
    borderTop: "1px solid #f3f4f6",
    padding: "16px 20px",
    background: "#f9fafb",
  },
  webhookUrl: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "monospace",
    fontSize: 12,
    color: "#374151",
    wordBreak: "break-all",
    flex: 1,
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genToken = () =>
  Math.random().toString(36).slice(2, 10) +
  Math.random().toString(36).slice(2, 10);

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  `${window.location.protocol}//${window.location.host}`;

// ─── Component ────────────────────────────────────────────────────────────────

const FlowBuilderTriggerModal = ({ open, onClose, triggers = [], onSave, flowActive = true }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [selectedCat, setSelectedCat] = useState("mensagens");
  const [selectedType, setSelectedType] = useState(null);
  const [config, setConfig] = useState({});
  const [whatsapps, setWhatsapps] = useState([]);
  const [editing, setEditing] = useState(null); // trigger being edited

  // Load existing trigger for editing when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCat("mensagens");
      setSelectedType(null);
      setConfig({});
      setEditing(null);
    }
  }, [open]);

  useEffect(() => {
    api
      .get("/whatsapp", { params: { session: 0 } })
      .then(({ data }) => setWhatsapps(sortWhatsappsByUserQueues(data || [], user)))
      .catch(() => {});
  }, [user]);

  const currentCat = CATEGORIES.find((c) => c.id === selectedCat);

  const handleSelectTrigger = (trigger) => {
    setSelectedType(trigger.type);
    const existing = triggers.find((t) => t.type === trigger.type);
    if (existing) {
      setConfig(existing.config || {});
      setEditing(existing.id);
    } else {
      const defaultConfig = {};
      if (trigger.type === "http_webhook") {
        defaultConfig.token = genToken();
      }
      if (trigger.fields?.some((field) => field.name === "whatsappId")) {
        defaultConfig.whatsappId = getPreferredWhatsappId(whatsapps, user);
      }
      setConfig(defaultConfig);
      setEditing(null);
    }
  };

  const handleAdd = () => {
    if (!selectedType) return;

    const newTrigger = {
      id: editing || `trig_${genToken()}`,
      type: selectedType,
      category: selectedCat,
      config,
    };

    const updated = editing
      ? triggers.map((t) => (t.id === editing ? newTrigger : t))
      : [...triggers.filter((t) => t.type !== selectedType), newTrigger];

    onSave(updated);
    onClose();
  };

  const handleRemoveTrigger = (triggerId, e) => {
    e.stopPropagation();
    const updated = triggers.filter((t) => t.id !== triggerId);
    onSave(updated);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success("URL copiada!"));
  };

  const webhookUrl = `${BACKEND_URL}/api/public/flow-webhook/${config.token || ""}`;

  return (
    <Dialog open={open} onClose={onClose} className={classes.dialog}>
      {/* Header */}
      <div className={classes.dialogTitle}>
        <div>
          <Typography variant="h6" style={{ fontWeight: 700, fontSize: 16 }}>
            Adicionar gatilho
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ fontSize: 12 }}>
            Selecione o evento que vai iniciar este fluxo
          </Typography>
        </div>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      {/* Aviso: fluxo inativo não dispara */}
      {!flowActive && (
        <Box
          mx={3}
          mt={1.5}
          p={1.5}
          style={{
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: 8,
          }}
        >
          <Typography variant="body2" style={{ fontSize: 12, color: "#92400e" }}>
            Você configurou gatilhos, mas este fluxo ainda está inativo. Publique
            o fluxo (botão "Publicar fluxo" no editor) para que ele possa disparar
            automaticamente.
          </Typography>
        </Box>
      )}

      {/* Active triggers chips */}
      {triggers.length > 0 && (
        <Box px={3} pt={1.5} pb={0} display="flex" flexWrap="wrap" style={{ gap: 6 }}>
          {triggers.map((t) => {
            const meta = CATEGORIES.flatMap((c) => c.triggers).find(
              (tr) => tr.type === t.type
            );
            return (
              <Chip
                key={t.id}
                size="small"
                label={meta?.label || t.type}
                onDelete={(e) => handleRemoveTrigger(t.id, e)}
                color="primary"
                variant="outlined"
                style={{ fontSize: 11 }}
              />
            );
          })}
        </Box>
      )}

      {/* Category + trigger list */}
      <div className={classes.layout}>
        {/* Sidebar */}
        <div className={classes.sidebar}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`${classes.catItem} ${
                selectedCat === cat.id ? classes.catItemActive : ""
              }`}
              onClick={() => {
                setSelectedCat(cat.id);
                setSelectedType(null);
                setConfig({});
              }}
            >
              <span style={{ fontSize: 16 }}>{cat.emoji}</span>
              {cat.label}
            </div>
          ))}
        </div>

        {/* Trigger options */}
        <div className={classes.triggerList}>
          {currentCat && (
            <>
              <Typography
                variant="subtitle2"
                style={{ fontWeight: 700, marginBottom: 8, color: "#374151" }}
              >
                {currentCat.label}
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                style={{ fontSize: 12, marginBottom: 12 }}
              >
                Adicione gatilhos para ações em {currentCat.label.toLowerCase()}
              </Typography>

              {currentCat.triggers.map((trigger) => {
                const isActive = triggers.some((t) => t.type === trigger.type);
                const isSelected = selectedType === trigger.type;
                return (
                  <div
                    key={trigger.type}
                    className={`${classes.triggerCard} ${
                      isSelected ? classes.triggerCardSelected : ""
                    }`}
                    onClick={() => handleSelectTrigger(trigger)}
                  >
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isActive ? "#dcfce7" : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        {isActive ? "✅" : "▶"}
                      </span>
                    </Box>
                    <div>
                      <Typography
                        variant="body2"
                        style={{ fontWeight: 600, fontSize: 13 }}
                      >
                        {trigger.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        style={{ fontSize: 11 }}
                      >
                        {trigger.description}
                      </Typography>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Config panel for selected trigger */}
      {selectedType && (
        <div className={classes.configPanel}>
          {/* message_received: keyword filter */}
          {selectedType === "message_received" && (
            <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
              <Typography variant="caption" style={{ fontWeight: 700, color: "#374151" }}>
                Filtro de palavra-chave (opcional)
              </Typography>
              <Box display="flex" style={{ gap: 8 }}>
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder="Ex: oi, olá, início (vazio = qualquer mensagem)"
                  value={config.keyword || ""}
                  onChange={(e) => setConfig({ ...config, keyword: e.target.value })}
                  style={{ flex: 1 }}
                />
                <FormControl size="small" variant="outlined" style={{ minWidth: 140 }}>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    label="Tipo"
                    value={config.matchType || "contains"}
                    onChange={(e) =>
                      setConfig({ ...config, matchType: e.target.value })
                    }
                    MenuProps={flowBuilderSelectMenuProps}
                  >
                    <MenuItem value="contains">Contém</MenuItem>
                    <MenuItem value="exact">Exato</MenuItem>
                    <MenuItem value="starts">Inicia com</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <FormControl size="small" variant="outlined">
                <InputLabel>Conexão WhatsApp (opcional)</InputLabel>
                <Select
                  label="Conexão WhatsApp (opcional)"
                  value={config.whatsappId || ""}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappId: e.target.value })
                  }
                  MenuProps={flowBuilderSelectMenuProps}
                >
                  <MenuItem value="">Qualquer conexão</MenuItem>
                  {whatsapps.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* http_webhook: show URL */}
          {selectedType === "http_webhook" && (
            <Box display="flex" flexDirection="column" style={{ gap: 10 }}>
              <Typography variant="caption" style={{ fontWeight: 700, color: "#374151" }}>
                URL do Webhook (copie e configure no sistema externo)
              </Typography>
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                <div className={classes.webhookUrl}>{webhookUrl}</div>
                <Tooltip title="Copiar URL">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <FileCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="textSecondary" style={{ fontSize: 11 }}>
                Faça um POST para esta URL com <code>contactNumber</code> e <code>contactName</code> no body para iniciar o fluxo.
              </Typography>
              <FormControl size="small" variant="outlined">
                <InputLabel>Conexão WhatsApp para envio</InputLabel>
                <Select
                  label="Conexão WhatsApp para envio"
                  value={config.whatsappId || ""}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappId: e.target.value })
                  }
                  MenuProps={flowBuilderSelectMenuProps}
                >
                  <MenuItem value="">Automático (primeira conectada)</MenuItem>
                  {whatsapps.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Internal events: whatsapp selector */}
          {[
            "lead_created",
            "lead_updated",
            "lead_status_changed",
            "lead_stage_changed",
            "lead_converted",
            "lead_lost",
            "ticket_created",
            "ticket_closed",
            "opportunity_created",
            "opportunity_moved",
            "opportunity_updated",
            "opportunity_won",
            "opportunity_lost",
            "move_lead",
            "kanban_event",
            "appointment_created",
            "appointment_updated",
            "appointment_cancelled",
            "appointment_completed",
            "appointment_rescheduled",
            "reminder_created",
            "reminder_sent",
            "reminder_cancelled",
            "call_started",
            "call_answered",
            "call_not_answered",
            "call_finished",
            "call_recorded",
            "call_lost",
            "client_created",
            "client_updated",
            "client_converted",
            "client_reactivated",
            "client_inactivated",
            "group_created",
            "group_updated",
            "group_removed",
            "group_message_sent",
            "group_event_received",
            "flow_triggered",
          ].includes(
            selectedType
          ) && (
            <FormControl size="small" variant="outlined" fullWidth>
              <InputLabel>Conexão WhatsApp para envio (opcional)</InputLabel>
              <Select
                label="Conexão WhatsApp para envio (opcional)"
                value={config.whatsappId || ""}
                onChange={(e) =>
                  setConfig({ ...config, whatsappId: e.target.value })
                }
                MenuProps={flowBuilderSelectMenuProps}
              >
                <MenuItem value="">Automático (primeiro conectado)</MenuItem>
                {whatsapps.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </div>
      )}

      {/* Actions */}
      <DialogActions style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
        <Button onClick={onClose} style={{ borderRadius: 8 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!selectedType}
          onClick={handleAdd}
          style={{ borderRadius: 8 }}
        >
          {editing ? "Atualizar gatilho" : "Adicionar gatilho"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderTriggerModal;
