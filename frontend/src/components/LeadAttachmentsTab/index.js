import React, { useState, useEffect, useCallback, useContext } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    LinearProgress,
    Paper,
    Tooltip,
    Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import InsertDriveFileIcon from "@material-ui/icons/InsertDriveFile";
import ImageIcon from "@material-ui/icons/Image";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import DescriptionIcon from "@material-ui/icons/Description";
import TableChartIcon from "@material-ui/icons/TableChart";
import GetAppIcon from "@material-ui/icons/GetApp";
import DeleteIcon from "@material-ui/icons/Delete";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";
import api from "../../services/api";
import { getBackendUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: theme.spacing(2),
    },
    // ── Dropzone ─────────────────────────────────────────────────────────────
    dropzone: {
        border: "2px dashed #b0bec5",
        borderRadius: 10,
        padding: theme.spacing(2, 3),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(1.5),
        cursor: "pointer",
        backgroundColor: "#fafafa",
        transition: "border-color 0.2s, background-color 0.2s",
        minHeight: 72,
        "&:hover": {
            borderColor: "#1976d2",
            backgroundColor: "#f0f7ff",
        },
    },
    dropzoneActive: {
        borderColor: "#4caf50",
        backgroundColor: "#f0fff4",
        borderStyle: "solid",
        animation: "$pulse 1s ease-in-out infinite",
    },
    dropzoneReject: {
        borderColor: "#f44336",
        backgroundColor: "#fff5f5",
    },
    "@keyframes pulse": {
        "0%": { boxShadow: "0 0 0 0 rgba(76,175,80,0.4)" },
        "70%": { boxShadow: "0 0 0 8px rgba(76,175,80,0)" },
        "100%": { boxShadow: "0 0 0 0 rgba(76,175,80,0)" },
    },
    dropzoneText: {
        fontSize: 13,
        color: "#546e7a",
        textAlign: "center",
    },
    dropzoneHint: {
        fontSize: 11,
        color: "#90a4ae",
    },
    uploadIcon: {
        color: "#90a4ae",
        fontSize: 32,
    },
    uploadIconActive: {
        color: "#4caf50",
    },
    // ── Upload progress ───────────────────────────────────────────────────────
    progressBar: {
        borderRadius: 4,
        height: 6,
        marginTop: 2,
    },
    // ── Empty state ───────────────────────────────────────────────────────────
    emptyState: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#b0bec5",
        gap: theme.spacing(1),
        padding: theme.spacing(4),
    },
    // ── File list ─────────────────────────────────────────────────────────────
    fileList: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1),
    },
    fileCard: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(1, 1.5),
        borderRadius: 8,
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        gap: theme.spacing(1.5),
        transition: "box-shadow 0.15s",
        "&:hover": {
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        },
    },
    fileCardDeleting: {
        opacity: 0.5,
        pointerEvents: "none",
    },
    fileIcon: {
        flexShrink: 0,
        fontSize: 32,
    },
    fileInfo: {
        flex: 1,
        minWidth: 0,
    },
    fileName: {
        fontSize: 13,
        fontWeight: 600,
        color: "#263238",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    fileMeta: {
        fontSize: 11,
        color: "#78909c",
        marginTop: 2,
    },
    fileActions: {
        display: "flex",
        gap: 4,
        flexShrink: 0,
    },
    confirmDeleteRow: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 0",
    },
    confirmDeleteText: {
        fontSize: 12,
        color: "#ef5350",
        fontWeight: 600,
    },
}));

// ── File type icon + color ────────────────────────────────────────────────────
function FileTypeIcon({ mimetype, className }) {
    const classes = useStyles();
    if (!mimetype) return <InsertDriveFileIcon className={className || classes.fileIcon} style={{ color: "#78909c" }} />;
    if (mimetype.startsWith("image/")) return <ImageIcon className={className || classes.fileIcon} style={{ color: "#1976d2" }} />;
    if (mimetype === "application/pdf") return <PictureAsPdfIcon className={className || classes.fileIcon} style={{ color: "#e53935" }} />;
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel") || mimetype.includes("csv"))
        return <TableChartIcon className={className || classes.fileIcon} style={{ color: "#388e3c" }} />;
    if (mimetype.includes("word") || mimetype.includes("document") || mimetype.includes("text/"))
        return <DescriptionIcon className={className || classes.fileIcon} style={{ color: "#1565c0" }} />;
    return <InsertDriveFileIcon className={className || classes.fileIcon} style={{ color: "#78909c" }} />;
}

// ── Format file size ──────────────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ── Main component ────────────────────────────────────────────────────────────
const LeadAttachmentsTab = ({ leadId, op }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);

    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    // confirmingDelete: attachmentId being confirmed, or null
    const [confirmingDelete, setConfirmingDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // ── Load attachments ──────────────────────────────────────────────────────
    const fetchAttachments = useCallback(async () => {
        if (!leadId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/crm/leads/${leadId}/attachments`);
            setAttachments(data || []);
        } catch {
            toast.error("Erro ao carregar anexos.");
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    // ── Upload ────────────────────────────────────────────────────────────────
    const handleUpload = useCallback(
        async (files) => {
            if (!leadId || !files.length) return;
            const formData = new FormData();
            files.forEach((f) => formData.append("files", f));

            setUploading(true);
            setUploadProgress(0);
            try {
                const { data } = await api.post(`/crm/leads/${leadId}/attachments`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (e) => {
                        if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
                    },
                });
                setAttachments((prev) => [...data, ...prev]);
                toast.success(
                    files.length === 1
                        ? `Arquivo "${files[0].name}" anexado!`
                        : `${files.length} arquivos anexados!`
                );
            } catch (err) {
                toast.error(err?.response?.data?.error || "Erro ao enviar arquivo(s).");
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        },
        [leadId]
    );

    // ── Dropzone ──────────────────────────────────────────────────────────────
    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop: handleUpload,
        maxSize: 50 * 1024 * 1024, // 50 MB
        multiple: true,
        disabled: uploading || !leadId,
        onDropRejected: (rejections) => {
            const tooLarge = rejections.some((r) => r.errors.some((e) => e.code === "file-too-large"));
            if (tooLarge) toast.warning("Um ou mais arquivos excedem o limite de 50 MB.");
        },
    });

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDeleteConfirm = (id) => setConfirmingDelete(id);
    const handleDeleteCancel = () => setConfirmingDelete(null);

    const handleDeleteExecute = async (id) => {
        setConfirmingDelete(null);
        setDeletingId(id);
        try {
            await api.delete(`/crm/leads/${leadId}/attachments/${id}`);
            setAttachments((prev) => prev.filter((a) => a.id !== id));
            toast.success("Anexo removido.");
        } catch {
            toast.error("Erro ao remover anexo.");
        } finally {
            setDeletingId(null);
        }
    };

    // ── Build download URL ────────────────────────────────────────────────────
    const buildUrl = (attachment) => {
        const companyId = user?.companyId || op?.companyId;
        return `${getBackendUrl()}/public/company${companyId}/leads/${leadId}/${attachment.filename}`;
    };

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (!leadId) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="textSecondary" variant="body2">
                    Salve o lead primeiro para habilitar os anexos.
                </Typography>
            </Box>
        );
    }

    return (
        <Box className={classes.root}>
            {/* ── Zona de upload (drag & drop / click) ──────────────────────── */}
            <Box
                {...getRootProps()}
                className={`${classes.dropzone} ${isDragActive ? classes.dropzoneActive : ""} ${
                    isDragReject ? classes.dropzoneReject : ""
                }`}
            >
                <input {...getInputProps()} />
                <CloudUploadIcon
                    className={`${classes.uploadIcon} ${isDragActive ? classes.uploadIconActive : ""}`}
                />
                <Box>
                    {isDragActive ? (
                        <Typography className={classes.dropzoneText} style={{ color: "#4caf50", fontWeight: 600 }}>
                            Solte os arquivos aqui
                        </Typography>
                    ) : (
                        <>
                            <Typography className={classes.dropzoneText}>
                                <strong>Arraste arquivos</strong> aqui ou{" "}
                                <span style={{ color: "#1976d2", textDecoration: "underline" }}>
                                    clique para selecionar
                                </span>
                            </Typography>
                            <Typography className={classes.dropzoneHint}>
                                PDF, imagens, documentos, planilhas... até 50 MB por arquivo
                            </Typography>
                        </>
                    )}
                </Box>
            </Box>

            {/* ── Barra de progresso durante upload ─────────────────────────── */}
            {uploading && (
                <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography style={{ fontSize: 12, color: "#546e7a" }}>Enviando...</Typography>
                        <Typography style={{ fontSize: 12, color: "#546e7a" }}>{uploadProgress}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        className={classes.progressBar}
                        color="primary"
                    />
                </Box>
            )}

            {/* ── Lista de arquivos ──────────────────────────────────────────── */}
            {loading ? (
                <Box display="flex" justifyContent="center" pt={3}>
                    <CircularProgress size={28} />
                </Box>
            ) : attachments.length === 0 ? (
                <Box className={classes.emptyState}>
                    <CloudUploadIcon style={{ fontSize: 48, color: "#cfd8dc" }} />
                    <Typography style={{ fontSize: 14, color: "#90a4ae" }}>
                        Nenhum arquivo anexado ainda
                    </Typography>
                    <Typography style={{ fontSize: 12, color: "#b0bec5" }}>
                        Arraste arquivos para a área acima ou clique para selecionar
                    </Typography>
                </Box>
            ) : (
                <Box className={classes.fileList}>
                    <Typography style={{ fontSize: 12, color: "#78909c", marginBottom: 4 }}>
                        {attachments.length} {attachments.length === 1 ? "arquivo" : "arquivos"} anexado
                        {attachments.length !== 1 ? "s" : ""}
                    </Typography>
                    {attachments.map((att) => (
                        <Paper
                            key={att.id}
                            elevation={0}
                            className={`${classes.fileCard} ${
                                deletingId === att.id ? classes.fileCardDeleting : ""
                            }`}
                        >
                            <FileTypeIcon mimetype={att.mimetype} />

                            <Box className={classes.fileInfo}>
                                <Typography className={classes.fileName} title={att.originalName}>
                                    {att.originalName}
                                </Typography>
                                <Typography className={classes.fileMeta}>
                                    {formatSize(att.size)}
                                    {att.createdAt && (
                                        <>
                                            {" · "}
                                            {format(new Date(att.createdAt), "dd/MM/yyyy HH:mm", {
                                                locale: ptBR,
                                            })}
                                        </>
                                    )}
                                    {att.mimetype && (
                                        <>
                                            {" · "}
                                            <Chip
                                                label={att.mimetype.split("/").pop().toUpperCase()}
                                                size="small"
                                                style={{
                                                    fontSize: 9,
                                                    height: 16,
                                                    padding: "0 4px",
                                                    backgroundColor: "#eceff1",
                                                }}
                                            />
                                        </>
                                    )}
                                </Typography>

                                {/* Confirmação inline de exclusão */}
                                {confirmingDelete === att.id && (
                                    <Box className={classes.confirmDeleteRow}>
                                        <Typography className={classes.confirmDeleteText}>
                                            Remover este arquivo?
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            style={{
                                                backgroundColor: "#ef5350",
                                                color: "#fff",
                                                fontSize: 11,
                                                padding: "2px 8px",
                                                minWidth: "auto",
                                                textTransform: "none",
                                            }}
                                            onClick={() => handleDeleteExecute(att.id)}
                                        >
                                            Remover
                                        </Button>
                                        <Button
                                            size="small"
                                            style={{ fontSize: 11, padding: "2px 8px", textTransform: "none" }}
                                            onClick={handleDeleteCancel}
                                        >
                                            Cancelar
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            <Box className={classes.fileActions}>
                                <Tooltip title="Baixar arquivo">
                                    <IconButton
                                        size="small"
                                        component="a"
                                        href={buildUrl(att)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={att.originalName}
                                        style={{ color: "#1976d2" }}
                                    >
                                        <GetAppIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Remover anexo">
                                    <IconButton
                                        size="small"
                                        style={{ color: "#ef9a9a" }}
                                        onClick={() => handleDeleteConfirm(att.id)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default LeadAttachmentsTab;
