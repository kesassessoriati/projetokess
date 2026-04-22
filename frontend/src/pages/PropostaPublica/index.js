import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CircularProgress, Typography, makeStyles } from "@material-ui/core";

import ProposalViewer from "../../components/ProposalViewer";
import { openApi } from "../../services/api";
import { normalizeProposalData } from "../../utils/proposalBuilder";

const useStyles = makeStyles(() => ({
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#080811",
  },
  error: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 10,
    padding: 24,
    color: "#f8fafc",
    background: "#080811",
    textAlign: "center",
  },
}));

const PropostaPublica = () => {
  const classes = useStyles();
  const { slug } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProposal = async () => {
      try {
        const { data } = await openApi.get(`/proposals/public/${slug}`);
        if (!mounted) return;
        setProposal({
          ...data,
          data: normalizeProposalData(data),
        });
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProposal();

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className={classes.loading}>
        <CircularProgress />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className={classes.error}>
        <Typography variant="h5" style={{ fontWeight: 800 }}>Proposta não encontrada</Typography>
        <Typography variant="body2" style={{ color: "#94a3b8" }}>
          O link pode estar incorreto ou a proposta ainda não foi publicada.
        </Typography>
      </div>
    );
  }

  return <ProposalViewer proposal={proposal} data={proposal.data} />;
};

export default PropostaPublica;
