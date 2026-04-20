import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, IconButton,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";

const useStyles = makeStyles(() => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 16,
      width: 820,
      maxWidth: "96vw",
      overflow: "hidden",
    },
  },
  layout: {
    display: "flex",
    gap: 16,
    height: 420,
  },
  editor: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 13,
    background: "#1e1e2e",
    color: "#cdd6f4",
    border: "none",
    outline: "none",
    padding: "12px 16px",
    borderRadius: 10,
    resize: "none",
    lineHeight: 1.6,
    tabSize: 2,
  },
  docs: {
    width: 240,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 14px",
    overflowY: "auto",
    fontSize: 12,
    color: "#374151",
    flexShrink: 0,
  },
  docSection: {
    marginBottom: 12,
  },
  docTitle: {
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  docMethod: {
    fontFamily: "monospace",
    fontSize: 11,
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: 4,
    padding: "3px 6px",
    marginBottom: 4,
    display: "block",
    color: "#1d4ed8",
    lineHeight: 1.4,
  },
}));

const DOCS = [
  {
    title: "🔧 Métodos Disponíveis",
    items: [
      "await session.getValue(name)\nRetorna variável da sessão",
      "await session.setValue(name, value)\nDefine variável na sessão",
      "await session.getAdditionalValue(name)\nRetorna campo adicional",
      "await session.setAdditionalValue(name, value)\nDefine campo adicional",
      "session.datasources[\"DataSource\"]\nAcessa fonte de dados",
    ],
  },
  {
    title: "📦 Parâmetros Comuns",
    items: [
      "leadId, leadName, leadEmail",
      "leadPhone, leadCompany",
      "businessId, businessTotal",
      "businessCode, businessExternalId",
      "instanceId, stageId",
      "conversationId",
    ],
  },
  {
    title: "⚠️ Observações",
    items: [
      "Código executado em ambiente seguro",
      "Limite de 30 segundos de execução",
      "Use await para operações assíncronas",
    ],
  },
];

const DEFAULT_CODE = `// Exemplo: manipular variáveis da sessão
const nome = await session.getValue("nome");
await session.setValue("saudacao", \`Olá, \${nome}!\`);
`;

const FlowBuilderJavaScriptModal = ({ open, data, onSave, onUpdate, close }) => {
  const classes = useStyles();
  const [code, setCode] = useState(DEFAULT_CODE);

  useEffect(() => {
    if (open) {
      setCode(data?.data?.code || data?.code || DEFAULT_CODE);
    }
  }, [open, data]);

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newVal = code.substring(0, start) + "  " + code.substring(end);
      setCode(newVal);
      setTimeout(() => {
        e.target.selectionStart = start + 2;
        e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleSave = () => {
    const nodeData = { code };
    if (open === "edit" && data) {
      onUpdate({ ...data, data: { ...data.data, code } });
    } else {
      onSave(nodeData);
    }
    close();
  };

  return (
    <Dialog open={!!open} onClose={close} className={classes.dialog}>
      <DialogTitle style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Typography variant="h6" style={{ fontWeight: 700, fontSize: 16 }}>Execução de JavaScript</Typography>
          <Typography variant="body2" color="textSecondary" style={{ fontSize: 12 }}>
            Execute código JavaScript personalizado para manipular dados da sessão
          </Typography>
        </div>
        <IconButton size="small" onClick={close}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: "16px 20px" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4, fontFamily: "monospace" }}>script.js</span>
        </div>

        <div className={classes.layout}>
          <textarea
            className={classes.editor}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="// Digite seu código JavaScript aqui..."
          />
          <div className={classes.docs}>
            {DOCS.map((section) => (
              <div key={section.title} className={classes.docSection}>
                <div className={classes.docTitle}>{section.title}</div>
                {section.items.map((item, i) => (
                  <span key={i} className={classes.docMethod}>{item}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <Box mt={1.5} p={1.5} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
          <Typography variant="caption" style={{ color: "#92400e", fontSize: 11 }}>
            ⚠️ O código será executado em um ambiente seguro com limite de tempo de execução de 30 segundos.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
        <Button onClick={close} style={{ borderRadius: 8 }}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleSave} style={{ borderRadius: 8 }}>
          {open === "edit" ? "Atualizar" : "Adicionar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderJavaScriptModal;
