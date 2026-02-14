import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
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
import { Stack } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
    marginBottom: theme.spacing(2),
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

const FlowBuilderApiRequestModal = ({
  open,
  onSave,
  data,
  onUpdate,
  close
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const [activeModal, setActiveModal] = useState(false);
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [saveResponse, setSaveResponse] = useState("");
  const [savedVariables, setSavedVariables] = useState([]);
  const [newVariable, setNewVariable] = useState({ path: "", name: "" });
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);

  useEffect(() => {
    if (open === 'edit') {
      setMethod(data?.data?.method || "GET");
      setUrl(data?.data?.url || "");
      setHeaders(data?.data?.headers || "");
      setBody(data?.data?.body || "");
      setSaveResponse(data?.data?.saveResponse || "");
      setSavedVariables(data?.data?.savedVariables || []);
      setActiveModal(true);
    } else if (open === 'create') {
      setMethod("GET");
      setUrl("");
      setHeaders("");
      setBody("");
      setSaveResponse("");
      setSavedVariables([]);
      setNewVariable({ path: "", name: "" });
      setTestResult(null);
      setTestError(null);
      setActiveModal(true);
    }
    return () => {
      isMounted.current = false;
    };
  }, [open, data]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const addVariable = () => {
    if (newVariable.path && newVariable.name) {
      setSavedVariables([...savedVariables, { ...newVariable }]);
      setNewVariable({ path: "", name: "" });
    }
  };

  const removeVariable = (index) => {
    setSavedVariables(savedVariables.filter((_, i) => i !== index));
  };

  const testApi = async () => {
    setTestResult(null);
    setTestError(null);
    
    try {
      // Parse headers
      let parsedHeaders = {};
      if (headers) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch (e) {
          toast.error('Headers JSON inválido');
          setTestError('Headers JSON inválido: ' + e.message);
          return;
        }
      }

      // Parse body
      let parsedBody = null;
      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          toast.error('Body JSON inválido');
          setTestError('Body JSON inválido: ' + e.message);
          return;
        }
      }

      console.log("Testando API:", { method, url, headers: parsedHeaders, body: parsedBody });
      
      // Fazer requisição real
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...parsedHeaders
        },
        body: parsedBody ? JSON.stringify(parsedBody) : undefined
      });

      const responseData = await response.json();
      
      console.log("Resposta da API:", responseData);
      
      if (response.ok) {
        setTestResult({
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries())
        });
        toast.success(`API testada com sucesso! Status: ${response.status}`);
        
        // Extrair variáveis de exemplo
        if (savedVariables.length > 0) {
          const extractedVars = {};
          savedVariables.forEach(variable => {
            try {
              const value = getNestedValue(responseData, variable.path);
              if (value !== undefined) {
                extractedVars[variable.name] = value;
              }
            } catch (e) {
              console.log("Erro ao extrair variável:", e);
            }
          });
          
          if (Object.keys(extractedVars).length > 0) {
            setTestResult(prev => ({
              ...prev,
              extractedVariables: extractedVars
            }));
          }
        }
      } else {
        setTestError(`Erro ${response.status}: ${response.statusText}`);
        toast.error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error("Erro ao testar API:", error);
      const errorMessage = error.message || 'Erro desconhecido';
      setTestError('Erro na requisição: ' + errorMessage);
      toast.error('Erro ao testar API: ' + errorMessage);
    }
  };

  // Função para extrair valores de objetos JSON usando path
  const getNestedValue = (obj, path) => {
    if (!path || !obj) return undefined;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  };

  const handleSave = () => {
    if (!url) {
      return toast.error('Informe a URL da requisição');
    }
    const apiData = {
      method,
      url,
      headers,
      body,
      saveResponse,
      savedVariables,
    };
    if (open === 'edit') {
      onUpdate({
        ...data,
        data: apiData
      });
    } else if (open === 'create') {
      onSave({
        data: apiData
      });
    }
    handleClose();
  };

  return (
    <div className={classes.root}>
      <Dialog open={activeModal} onClose={handleClose} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle id="form-dialog-title">
          {open === 'create' ? `Adicionar requisição API` : `Editar requisição API`}
        </DialogTitle>
        <Stack>
          <DialogContent dividers>
            <FormControl fullWidth style={{ marginBottom: 16 }}>
              <InputLabel id="method-label">Método HTTP</InputLabel>
              <Select
                labelId="method-label"
                id="method-select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="PATCH">PATCH</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="URL da requisição"
              placeholder="https://api.exemplo.com/endpoint"
              fullWidth
              variant="outlined"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={classes.textField}
            />

            <TextField
              label="Headers (JSON)"
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className={classes.textField}
            />

            {(method === "POST" || method === "PUT" || method === "PATCH") && (
              <TextField
                label="Body (JSON)"
                placeholder='{"nome": "{{name}}", "telefone": "{{number}}"}'
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={classes.textField}
                helperText="Use variáveis como {{name}}, {{number}}, {{email}}, etc."
              />
            )}

            {/* Seção de Variáveis Salvas */}
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: 12, color: "#374151" }}>
                📦 Extrair variáveis da resposta
              </div>
              
              {/* Lista de variáveis já configuradas */}
              {savedVariables.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: 6 }}>Variáveis configuradas:</div>
                  {savedVariables.map((variable, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "11px", backgroundColor: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4 }}>
                        {variable.name}
                      </span>
                      <span style={{ fontSize: "10px", color: "#6b7280" }}>← {variable.path}</span>
                      <button
                        onClick={() => removeVariable(index)}
                        style={{
                          fontSize: "10px",
                          color: "#ef4444",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Adicionar nova variável */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Path JSON (ex: data.user.id)"
                    placeholder="response.data.id"
                    size="small"
                    variant="outlined"
                    value={newVariable.path}
                    onChange={(e) => setNewVariable({ ...newVariable, path: e.target.value })}
                    fullWidth
                    style={{ marginBottom: 8 }}
                    helperText="Caminho no JSON da resposta"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Nome da variável"
                    placeholder="user_id"
                    size="small"
                    variant="outlined"
                    value={newVariable.name}
                    onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                    fullWidth
                    style={{ marginBottom: 8 }}
                    helperText="Nome para usar como {{user_id}}"
                  />
                </div>
                <Button
                  onClick={addVariable}
                  disabled={!newVariable.path || !newVariable.name}
                  variant="contained"
                  color="primary"
                  size="small"
                  style={{ marginBottom: 8 }}
                >
                  +
                </Button>
              </div>
              
              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: 8 }}>
                💡 Exemplo: Se API retorna {"{\"data\": {\"user\": {\"id\": 123}}}"}, use path "data.user.id" e nome "user_id"
              </div>
            </div>

            <TextField
              label="Salvar resposta completa em variável (opcional)"
              placeholder="api_response"
              fullWidth
              variant="outlined"
              value={saveResponse}
              onChange={(e) => setSaveResponse(e.target.value)}
              className={classes.textField}
              helperText="Nome da variável para armazenar toda a resposta da API"
            />

            {/* Resultado do Teste */}
            {(testResult || testError) && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                backgroundColor: testResult ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${testResult ? "#bbf7d0" : "#fecaca"}`,
                borderRadius: 8
              }}>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: 12, color: testResult ? "#166534" : "#dc2626" }}>
                  {testResult ? "✅ Resultado do Teste" : "❌ Erro no Teste"}
                </div>
                
                {testResult && (
                  <>
                    <div style={{ fontSize: "12px", color: "#059669", marginBottom: 8 }}>
                      <strong>Status:</strong> {testResult.status} {testResult.statusText}
                    </div>
                    
                    {testResult.extractedVariables && Object.keys(testResult.extractedVariables).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#059669", marginBottom: 4 }}>
                          📦 Variáveis Extraídas:
                        </div>
                        {Object.entries(testResult.extractedVariables).map(([name, value]) => (
                          <div key={name} style={{ fontSize: "11px", color: "#047857", marginBottom: 2 }}>
                            <strong>{name}:</strong> {JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ fontSize: "12px", color: "#059669", marginBottom: 8 }}>
                      <strong>Resposta:</strong>
                    </div>
                    <div style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      padding: 8,
                      maxHeight: 200,
                      overflow: "auto",
                      fontSize: "11px",
                      fontFamily: "monospace"
                    }}>
                      {JSON.stringify(testResult.data, null, 2)}
                    </div>
                  </>
                )}
                
                {testError && (
                  <div style={{ 
                    fontSize: "12px", 
                    color: "#dc2626",
                    backgroundColor: "#ffffff",
                    border: "1px solid #fca5a5",
                    borderRadius: 4,
                    padding: 8
                  }}>
                    {testError}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={testApi}
              startIcon={<PlayArrowIcon />}
              style={{
                color: "white",
                backgroundColor: "#3b82f6",
                boxShadow: "none",
                borderRadius: 0,
                fontSize: "12px",
                marginRight: 8,
              }}
              variant="contained"
            >
              Testar API
            </Button>
            <Button
              onClick={handleClose}
              startIcon={<CancelIcon />}
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
              type="submit"
              style={{
                color: "white",
                backgroundColor: "#22c55e",
                boxShadow: "none",
                borderRadius: 0,
                fontSize: "12px",
              }}
              variant="contained"
              onClick={handleSave}
            >
              Salvar
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </div>
  );
};

export default FlowBuilderApiRequestModal;
