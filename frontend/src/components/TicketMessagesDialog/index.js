import React, { useContext, useEffect, useState, useRef } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  makeStyles,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import CancelIcon from '@mui/icons-material/Cancel';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import { AuthContext } from "../../context/Auth/AuthContext";
import moment from "moment";
import html2pdf from "html2pdf.js";

const useStyles = makeStyles((theme) => ({
  previewContainer: {
    backgroundColor: "#fff",
    padding: "20px",
    color: "#000",
    fontFamily: "Arial, sans-serif"
  },
  pdfHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "2px solid #eee",
    paddingBottom: "10px"
  },
  messageRow: {
    marginBottom: "10px",
    padding: "8px",
    borderRadius: "8px",
    maxWidth: "80%",
    position: "relative"
  },
  messageFromMe: {
    backgroundColor: "#dcf8c6",
    marginLeft: "auto"
  },
  messageOthers: {
    backgroundColor: "#f0f0f0",
    marginRight: "auto"
  },
  senderName: {
    fontWeight: "bold",
    fontSize: "12px",
    marginBottom: "2px"
  },
  timestamp: {
    fontSize: "10px",
    color: "#777",
    textAlign: "right",
    marginTop: "4px"
  }
}));

export default function TicketMessagesDialog({ open, handleClose, ticketId }) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [ticket, setTicket] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    if (open && ticketId) {
      fetchData();
    }
  }, [open, ticketId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ticketData } = await api.get(`/tickets/${ticketId}`);
      setTicket(ticketData);

      const { data: messagesData } = await api.get(`/messages/${ticketId}`, {
        params: { pageNumber: 1 } // Pegando as mais recentes, mas PDF idealmente pegaria tudo. 
        // Para um log completo, talvez precisemos de um endpoint que retorne tudo.
      });
      setMessages(messagesData.messages.reverse());
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToPDF = () => {
    const element = pdfRef.current;
    const options = {
      margin: 10,
      filename: `Atendimento_${ticketId}_${ticket?.contact?.name || ""}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(options).save();
  };

  return (
    <Dialog maxWidth="md" fullWidth onClose={handleClose} open={open}>
      <DialogTitle>Exportar Conversa para PDF</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <div ref={pdfRef} className={classes.previewContainer}>
            {/* Cabeçalho do PDF */}
            <div className={classes.pdfHeader}>
              <div>
                <Typography variant="h6" style={{ color: "#3b82f6", fontWeight: "bold" }}>
                  Relatório de Atendimento #{ticketId}
                </Typography>
                <Typography variant="body2">
                  Empresa: {user?.company?.name || "AtendZappy"}
                </Typography>
              </div>
              <div style={{ textAlign: "right" }}>
                <Typography variant="body2">
                  Cliente: <strong>{ticket?.contact?.name}</strong>
                </Typography>
                <Typography variant="body2">
                  Data: {moment().format("DD/MM/YYYY HH:mm")}
                </Typography>
              </div>
            </div>

            {/* Lista de Mensagens */}
            <Box display="flex" flexDirection="column">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`${classes.messageRow} ${msg.fromMe ? classes.messageFromMe : classes.messageOthers}`}
                >
                  <div className={classes.senderName}>
                    {msg.fromMe ? user.name : (msg.contact?.name || ticket?.contact?.name)}
                  </div>
                  <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
                    {msg.body}
                  </Typography>
                  <div className={classes.timestamp}>
                    {moment(msg.createdAt).format("DD/MM/YYYY HH:mm")}
                  </div>
                </div>
              ))}
            </Box>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleExportToPDF}
          color="primary"
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          disabled={loading || messages.length === 0}
          style={{ backgroundColor: "#ef4444", color: "#fff" }}
        >
          Baixar PDF
        </Button>
        <Button
          startIcon={<CancelIcon />}
          onClick={handleClose}
          variant="outlined"
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
