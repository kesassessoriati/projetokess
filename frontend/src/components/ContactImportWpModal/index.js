import React, { useContext, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  Box,
  IconButton,
  Typography,
} from '@material-ui/core';
import { i18n } from '../../translate/i18n';
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { Can } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";
import * as XLSX from "xlsx";
import toastError from '../../errors/toastError';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ContactImport from "../ContactImport";

const useStyles = makeStyles((theme) => ({
  multFieldLine: {
    display: "flex",
    marginTop: 8,
  },
  optionButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    marginTop: 8,
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 8,
    backgroundColor: theme.palette.background.paper,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
    "&:hover": {
      backgroundColor: theme.mode === "light" ? "#f5f5f5" : "rgba(255,255,255,0.05)",
      borderColor: theme.palette.primary.main,
    },
  },
  optionNumber: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 500,
  },
  dialogTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px 8px",
  },
  dialogTitleText: {
    flex: 1,
    fontWeight: 700,
    fontSize: "1rem",
  },
  importWrapper: {
    padding: "0 16px 8px",
    minHeight: 300,
  },
}));

const ContactImportWpModal = ({ isOpen, handleClose, selectedTags, hideNum, userProfile }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [showImport, setShowImport] = useState(false);

  const handleClosed = () => {
    setShowImport(false);
    handleClose();
  };

  const handleBack = () => {
    setShowImport(false);
  };

  const handleOnExportContacts = async (model = false) => {
    const allDatas = [];
    let i = 1;
    if (!model) {
      while (i !== 0) {
        const { data } = await api.get("/contacts/", {
          params: { searchParam: "", pageNumber: i, contactTag: JSON.stringify(selectedTags) },
        });
        data.contacts.forEach((element) => {
          const tagsContact = element?.tags?.map(tag => tag?.name).join(', ');
          allDatas.push({ ...element, tags: tagsContact });
        });
        const pages = data?.count / 20;
        i++;
        if (i > pages) i = 0;
      }
    } else {
      allDatas.push({ name: "João", number: "5599999999999", email: "" });
    }

    const exportData = allDatas.map((e) => ({
      name: e.name,
      number: (hideNum && userProfile === "user"
        ? e.isGroup ? e.number : e.number.slice(0, -6) + "**-**" + e.number.slice(-2)
        : e.number),
      email: e.email,
      tags: e.tags,
    }));

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "backup_contatos.xlsx");
  };

  return (
    <Dialog
      fullWidth
      maxWidth={showImport ? "lg" : "sm"}
      open={isOpen}
      onClose={handleClosed}
    >
      {/* Custom title row */}
      <div className={classes.dialogTitleRow}>
        {showImport && (
          <IconButton size="small" onClick={handleBack} title="Voltar">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Typography className={classes.dialogTitleText}>
          {showImport
            ? i18n.t("contactImportWpModal.buttons.import")
            : i18n.t("Exportar / Importar contatos")}
        </Typography>
      </div>

      {showImport ? (
        /* Vista de importação inline */
        <DialogContent style={{ padding: "0 16px 16px" }}>
          <ContactImport onBack={handleBack} />
        </DialogContent>
      ) : (
        /* Vista das 3 opções */
        <>
          <DialogContent>
            <Can
              role={user.profile}
              perform="contacts-page:deleteContact"
              yes={() => (
                <div
                  className={classes.optionButton}
                  onClick={() => handleOnExportContacts(false)}
                >
                  <div className={classes.optionNumber}>1</div>
                  <Typography className={classes.optionLabel}>
                    {i18n.t("contactImportWpModal.title")}
                  </Typography>
                </div>
              )}
            />

            <div
              className={classes.optionButton}
              onClick={() => handleOnExportContacts(true)}
            >
              <div className={classes.optionNumber}>2</div>
              <Typography className={classes.optionLabel}>
                {i18n.t("contactImportWpModal.buttons.downloadModel")}
              </Typography>
            </div>

            <div
              className={classes.optionButton}
              onClick={() => setShowImport(true)}
            >
              <div className={classes.optionNumber}>3</div>
              <Typography className={classes.optionLabel}>
                {i18n.t("contactImportWpModal.buttons.import")}
              </Typography>
            </div>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClosed} color="primary">
              {i18n.t("contactImportWpModal.buttons.closed")}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default ContactImportWpModal;
