import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Typography } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    minWidth: 240,
  },
  header: {
    fontSize: 12,
    fontWeight: 700,
    color: "#54656f",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cards: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    border: "1px solid #d9dee3",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  imagePlaceholder: {
    height: 110,
    background: "linear-gradient(135deg, #dff6ec 0%, #f4fbf7 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#00a884",
    fontSize: 12,
    fontWeight: 700,
  },
  content: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111b21",
  },
  body: {
    fontSize: 13,
    color: "#54656f",
    whiteSpace: "pre-wrap",
  },
  footer: {
    fontSize: 11,
    color: "#8696a0",
  },
  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 4,
  },
  button: {
    justifyContent: "flex-start",
    textTransform: "none",
    borderRadius: 8,
    borderColor: "#d9dee3",
    color: "#111b21",
    fontWeight: 600,
    backgroundColor: "#fff",
    "&:hover": {
      backgroundColor: "#f7f9fa",
      borderColor: "#c9d1d9",
    },
  },
}));

const getButtonLabel = (button = {}) => {
  const base = button.texto || button.displayText || "Ação";
  switch (button.tipo) {
    case "cta_url":
    case "url":
      return `Abrir URL: ${base}`;
    case "cta_call":
    case "call":
      return `Ligar: ${base}`;
    case "cta_copy":
    case "copy":
      return `Copiar: ${base}`;
    default:
      return base;
  }
};

const CarouselPreview = ({ cards = [] }) => {
  const classes = useStyles();

  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  return (
    <div className={classes.root}>
      <Typography className={classes.header}>
        Carrossel interativo ({cards.length} card{cards.length > 1 ? "s" : ""})
      </Typography>

      <div className={classes.cards}>
        {cards.map((card, index) => (
          <div key={`${card.titulo || "card"}-${index}`} className={classes.card}>
            <div className={classes.imagePlaceholder}>
              {card.temImagem ? "Imagem do card" : "Card sem imagem"}
            </div>

            <div className={classes.content}>
              <Typography className={classes.title}>
                {card.titulo || `Card ${index + 1}`}
              </Typography>

              {card.descricao ? (
                <Typography className={classes.body}>
                  {card.descricao}
                </Typography>
              ) : null}

              {card.rodape ? (
                <Typography className={classes.footer}>
                  {card.rodape}
                </Typography>
              ) : null}

              {Array.isArray(card.botoes) && card.botoes.length > 0 ? (
                <div className={classes.buttons}>
                  {card.botoes.map((button, buttonIndex) => (
                    <Button
                      key={`${getButtonLabel(button)}-${buttonIndex}`}
                      variant="outlined"
                      size="small"
                      className={classes.button}
                    >
                      {getButtonLabel(button)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarouselPreview;
