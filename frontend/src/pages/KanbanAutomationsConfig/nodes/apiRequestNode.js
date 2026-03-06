import {
  ArrowForwardIos,
  ContentCopy,
  Delete,
  Http,
  Code,
  PlayArrow,
  DataObject,
} from "@mui/icons-material";
import React, { memo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { Handle } from "react-flow-renderer";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [isHovered, setIsHovered] = useState(false);
  const [variables, setVariables] = useState([]);
  const [testing, setTesting] = useState(false);

  // Extrair variáveis do fluxo
  useEffect(() => {
    try {
      const savedVariables = localStorage.getItem("variables");
      if (savedVariables) {
        const variablesArray = JSON.parse(savedVariables);
        const flowVariables = variablesArray.map(varName => ({
          name: varName.trim(),
          description: "Variável do fluxo"
        }));
        
        // Adicionar variáveis salvas neste nó API
        const savedApiVariables = data?.data?.savedVariables || [];
        const apiVariables = savedApiVariables.map(variable => ({
          name: variable.name,
          description: `API: ${variable.path}`
        }));
        
        // Combinar todas as variáveis
        const allVariables = [...flowVariables, ...apiVariables];
        
        // Remover duplicatas
        const uniqueVariables = allVariables.filter((variable, index, self) =>
          index === self.findIndex((v) => v.name === variable.name)
        );
        
        setVariables(uniqueVariables);
      }
    } catch (error) {
      console.log("Erro ao buscar variáveis:", error);
    }
  }, [data]);

  // Extrair variáveis salvas neste nó
  const savedApiVariables = data?.data?.savedVariables || [];

  const getMethodColor = (method) => {
    const colors = {
      GET: "#22c55e",
      POST: "#3b82f6",
      PUT: "#f59e0b",
      DELETE: "#ef4444",
      PATCH: "#8b5cf6",
    };
    return colors[method] || "#6b7280";
  };

  const method = data?.data?.method || data?.method || "GET";
  const url = data?.data?.url || data?.url || "";
  const headers = data?.data?.headers || {};
  const body = data?.data?.body || "";

  // Função para testar API
  const testApi = async () => {
    setTesting(true);
    try {
      // Substituir variáveis na URL e body
      let processedUrl = url;
      let processedBody = body;
      
      variables.forEach(variable => {
        const placeholder = `{{${variable.name}}}`;
        processedUrl = processedUrl.split(placeholder).join('[valor]');
        processedBody = processedBody.split(placeholder).join('[valor]');
      });

      console.log("Testando API:", processedUrl);
      // TODO: Implementar teste real da API
      
      toast.info(`Teste simulado para ${method} ${processedUrl}`);
    } catch (error) {
      console.error("Erro ao testar API:", error);
      toast.error("Erro ao testar API");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        minWidth: "280px",
        maxWidth: "280px",
        width: "280px",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        border: "2px solid #e5e7eb",
        boxShadow: isHovered 
          ? "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(34, 197, 94, 0.1)"
          : "0 4px 16px rgba(0, 0, 0, 0.06)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position="left"
        style={{
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          width: "16px",
          height: "16px",
          top: "24px",
          left: "-10px",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onConnect={params => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffffff",
            width: "8px",
            height: "8px",
            marginLeft: "2.5px",
            marginBottom: "0.5px",
            pointerEvents: "none"
          }}
        />
      </Handle>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "16px",
          top: "16px",
          cursor: "pointer",
          gap: "8px",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#e5e7eb";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
            e.target.style.transform = "scale(1)";
          }}
        >
          <ContentCopy
            sx={{ 
              width: "14px", 
              height: "14px", 
              color: "#6b7280"
            }}
          />
        </div>
        <div
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#fee2e2";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#fef2f2";
            e.target.style.transform = "scale(1)";
          }}
        >
          <Delete
            sx={{ 
              width: "14px", 
              height: "14px", 
              color: "#ef4444"
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)",
          }}
        >
          <Http
            sx={{
              width: "18px",
              height: "18px",
              color: "#ffffff",
            }}
          />
        </div>
        <div>
          <div 
            style={{ 
              color: "#111827", 
              fontSize: "16px", 
              fontWeight: "700",
              lineHeight: "1.2",
              marginBottom: "2px",
            }}
          >
            Requisição API
          </div>
          <div 
            style={{ 
              color: "#6b7280", 
              fontSize: "12px", 
              fontWeight: "500",
            }}
          >
            Chamada HTTP externa
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          backgroundColor: "#f0fdf4",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid #bbf7d0",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <span
            style={{
              backgroundColor: getMethodColor(method),
              color: "#ffffff",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              marginRight: "8px",
            }}
          >
            {method}
          </span>
          {isHovered && (
            <div
              onClick={testApi}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 6px",
                backgroundColor: "#22c55e",
                color: "white",
                borderRadius: "4px",
                fontSize: "10px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#16a34a";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#22c55e";
              }}
            >
              <PlayArrow sx={{ width: "12px", height: "12px" }} />
              {testing ? "Testando..." : "Testar"}
            </div>
          )}
        </div>
        <div 
          style={{
            fontSize: "13px",
            fontWeight: "500",
            color: "#166534",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "4px",
          }}
        >
          {url || "https://api.exemplo.com"}
        </div>
        {(Object.keys(headers).length > 0 || body) && (
          <div
            style={{
              fontSize: "11px",
              color: "#059669",
              opacity: 0.8,
            }}
          >
            {Object.keys(headers).length > 0 && `${Object.keys(headers).length} headers`}
            {Object.keys(headers).length > 0 && body && " • "}
            {body && "Body presente"}
          </div>
        )}
      </div>

      {/* Variáveis Salvas */}
      {savedApiVariables.length > 0 && (
        <div
          style={{
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#0c4a6e", marginBottom: "4px" }}>
            <DataObject sx={{ width: "12px", height: "12px", marginRight: "2px", verticalAlign: "middle" }} />
            Variáveis salvas: {savedApiVariables.length}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
            {savedApiVariables.map((variable, index) => (
              <span
                key={index}
                style={{
                  fontSize: "8px",
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  padding: "1px 4px",
                  borderRadius: "3px",
                  fontWeight: 500,
                }}
              >
                {variable.path || variable.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Variáveis Disponíveis */}
      {variables.length > 0 && (
        <div
          style={{
            backgroundColor: "#fafafa",
            border: "1px solid #e5e7eb",
            padding: "8px",
            borderRadius: "6px",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "9px", fontWeight: 600, color: "#374151", marginBottom: "3px" }}>
            <Code sx={{ width: "10px", height: "10px", marginRight: "2px", verticalAlign: "middle" }} />
            Use variáveis: {`{{variavel}}`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
            {variables.slice(0, 4).map((variable, index) => (
              <span
                key={index}
                style={{
                  fontSize: "7px",
                  backgroundColor: "#f3f4f6",
                  color: "#6b7280",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  fontWeight: 500,
                }}
              >
                {`{{${variable.name}}}`}
              </span>
            ))}
            {variables.length > 4 && (
              <span style={{ fontSize: "7px", color: "#9ca3af" }}>
                +{variables.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div
        style={{
          paddingTop: "12px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Http sx={{ width: "12px", height: "12px", marginRight: "4px" }} />
          Componente API
        </div>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          width: "16px",
          height: "16px",
          right: "-10px",
          top: "50%",
          cursor: 'pointer',
          border: "3px solid #ffffff",
          boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        isConnectable={isConnectable}
      >
        <ArrowForwardIos
          sx={{
            color: "#ffffff",
            width: "8px",
            height: "8px",
            marginLeft: "2px",
            marginBottom: "0.5px",
            pointerEvents: "none"
          }}
        />
      </Handle>
    </div>
  );
});
