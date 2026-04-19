import React from "react";
import { Drawer, makeStyles } from "@material-ui/core";
import { useWebphone } from "../../context/WebphoneContext";
import WebphoneWorkspace from "../WebphoneWorkspace";

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 380,
    maxWidth: "100vw",
    backgroundColor: theme.palette.background.default,
    borderLeft: "1px solid #d8e4db",
    boxShadow: "0 24px 40px rgba(15, 23, 42, 0.18)",
  },
}));

const WebphoneSidePanel = () => {
  const classes = useStyles();
  const { panelOpen, setPanelOpen } = useWebphone();

  return (
    <Drawer
      anchor="right"
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      classes={{ paper: classes.drawerPaper }}
    >
      <WebphoneWorkspace closable onClose={() => setPanelOpen(false)} />
    </Drawer>
  );
};

export default WebphoneSidePanel;
