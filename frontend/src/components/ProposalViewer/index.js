import React, { useMemo, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { normalizeProposalData } from "../../utils/proposalBuilder";

const useStyles = makeStyles(() => ({
  shell: ({ themeData, compact }) => ({
    "--proposal-primary": themeData.primaryColor || "#3b82f6",
    "--proposal-accent": themeData.accentColor || "#10b981",
    fontFamily: `${themeData.fontFamily || "Inter"}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    minHeight: compact ? "100%" : "100vh",
    color: "#f8fafc",
    background:
      "linear-gradient(135deg, #090914 0%, #111827 44%, #172554 100%)",
    padding: compact ? 18 : 28,
    overflow: "auto",
  }),
  container: {
    maxWidth: 1220,
    margin: "0 auto",
  },
  header: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(15, 23, 42, 0.72)",
    borderRadius: 20,
    padding: "26px 30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
    backdropFilter: "blur(18px)",
    animation: "$enterDown 420ms ease-out",
    "@media (max-width: 760px)": {
      alignItems: "flex-start",
      flexDirection: "column",
      padding: 22,
    },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
  logoIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 32,
    background: "linear-gradient(135deg, rgba(59,130,246,0.26), rgba(16,185,129,0.18))",
    border: "1px solid rgba(255,255,255,0.12)",
    overflow: "hidden",
    flexShrink: 0,
    "& img": {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      padding: 6,
    },
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.08,
    fontWeight: 850,
    letterSpacing: 0,
    color: "#e5e7eb",
    "& span": {
      color: "var(--proposal-primary)",
    },
    "@media (max-width: 760px)": {
      fontSize: 24,
    },
  },
  subtitle: {
    margin: "7px 0 0",
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 600,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 13px",
    borderRadius: 10,
    color: "#cbd5e1",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: 12,
    fontWeight: 700,
  },
  progressBlock: {
    minWidth: 134,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  progressWrap: {
    position: "relative",
    width: 94,
    height: 94,
  },
  progressSvg: {
    transform: "rotate(-90deg)",
    width: 94,
    height: 94,
  },
  progressText: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: 850,
    "& small": {
      fontSize: 13,
      color: "#94a3b8",
      marginLeft: 3,
    },
  },
  progressLabel: {
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 10,
    fontWeight: 800,
  },
  nav: {
    marginTop: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(30, 41, 59, 0.62)",
    borderRadius: 16,
    padding: 8,
    display: "flex",
    gap: 8,
    overflowX: "auto",
    animation: "$fadeUp 460ms ease-out",
  },
  navButton: {
    border: 0,
    color: "#cbd5e1",
    background: "transparent",
    padding: "11px 16px",
    borderRadius: 11,
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "160ms ease",
    "&:hover": {
      background: "rgba(255,255,255,0.08)",
      color: "#fff",
    },
  },
  navButtonActive: {
    color: "#fff",
    background: "linear-gradient(135deg, var(--proposal-primary), #4f46e5)",
    boxShadow: "0 12px 30px rgba(59,130,246,0.26)",
  },
  section: {
    paddingTop: 28,
    animation: "$fadeUp 340ms ease-out",
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 24,
    fontWeight: 850,
    color: "#e5e7eb",
  },
  sectionLead: {
    margin: "0 0 22px",
    color: "#94a3b8",
    fontSize: 14,
  },
  phaseList: {
    display: "grid",
    gap: 18,
  },
  phase: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(15, 23, 42, 0.70)",
    borderRadius: 18,
    overflow: "hidden",
  },
  phaseHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: 20,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    "@media (max-width: 760px)": {
      flexDirection: "column",
    },
  },
  phaseName: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    "& strong": {
      display: "block",
      fontSize: 18,
      color: "#f8fafc",
    },
    "& p": {
      margin: "4px 0 0",
      color: "#94a3b8",
      fontSize: 13,
    },
  },
  phaseIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    background: "var(--phase-color)",
  },
  phaseWeeks: {
    alignSelf: "flex-start",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.07)",
    padding: "7px 11px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    padding: 20,
  },
  action: {
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: 16,
    transition: "160ms ease",
    "&:hover": {
      transform: "translateY(-2px)",
      borderColor: "rgba(255,255,255,0.18)",
    },
    "& h4": {
      margin: "0 0 8px",
      color: "#f8fafc",
      fontSize: 15,
    },
    "& p": {
      margin: "0 0 10px",
      color: "#94a3b8",
      fontSize: 12,
    },
    "& ul": {
      margin: "10px 0 0 18px",
      color: "#cbd5e1",
      fontSize: 12,
    },
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  infoCard: {
    border: "1px solid rgba(255,255,255,0.11)",
    background: "rgba(15, 23, 42, 0.68)",
    borderRadius: 16,
    padding: 18,
    "& h3": {
      margin: "8px 0",
      color: "#f8fafc",
      fontSize: 17,
    },
    "& p": {
      margin: 0,
      color: "#94a3b8",
      fontSize: 13,
    },
  },
  fiveSNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    color: "#fff",
    background: "var(--card-color)",
  },
  script: {
    border: "1px solid rgba(255,255,255,0.11)",
    background: "rgba(15, 23, 42, 0.68)",
    borderRadius: 16,
    padding: 20,
    "& pre": {
      whiteSpace: "pre-wrap",
      margin: "12px 0 0",
      color: "#cbd5e1",
      fontFamily: "inherit",
      lineHeight: 1.7,
      fontSize: 13,
    },
  },
  budgetTable: {
    width: "100%",
    borderCollapse: "collapse",
    overflow: "hidden",
    borderRadius: 16,
    background: "rgba(15, 23, 42, 0.68)",
    "& th, & td": {
      padding: "14px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      textAlign: "left",
      color: "#cbd5e1",
      fontSize: 13,
    },
    "& th": {
      color: "#f8fafc",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
  },
  footer: {
    marginTop: 36,
    borderRadius: 22,
    padding: "34px 30px",
    background: "linear-gradient(135deg, var(--proposal-primary), #6d5dfc)",
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(59,130,246,0.28)",
    "& h2": {
      margin: 0,
      fontSize: 26,
      color: "#fff",
    },
    "& > p": {
      margin: "10px auto 24px",
      maxWidth: 720,
      color: "rgba(255,255,255,0.86)",
    },
  },
  footerCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
  },
  footerCard: {
    borderRadius: 16,
    padding: 18,
    background: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.16)",
    "& strong": {
      display: "block",
      marginTop: 8,
      color: "#fff",
    },
    "& p": {
      color: "rgba(255,255,255,0.82)",
      fontSize: 13,
      margin: "8px 0 0",
    },
  },
  quote: {
    margin: "26px auto 0",
    paddingTop: 22,
    maxWidth: 700,
    borderTop: "1px solid rgba(255,255,255,0.24)",
    color: "rgba(255,255,255,0.92)",
    fontStyle: "italic",
  },
  "@keyframes enterDown": {
    from: { opacity: 0, transform: "translateY(-14px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  "@keyframes fadeUp": {
    from: { opacity: 0, transform: "translateY(12px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
}));

const tabs = [
  { id: "cronograma", label: "📅 Cronograma" },
  { id: "diagnostico", label: "📋 Diagnóstico" },
  { id: "metodo5s", label: "⭐ Método 5S" },
  { id: "kpis", label: "📊 KPIs" },
  { id: "scripts", label: "💬 Scripts" },
  { id: "orcamento", label: "💰 Orçamento" },
];

const clampProgress = (value) => Math.max(0, Math.min(100, Number(value || 0)));

const ProposalViewer = ({ proposal, data: rawData, compact = false }) => {
  const data = useMemo(
    () => rawData || normalizeProposalData(proposal),
    [proposal, rawData]
  );
  const [activeTab, setActiveTab] = useState("cronograma");
  const themeData = data.theme || {};
  const classes = useStyles({ themeData, compact });
  const progress = clampProgress(data.progresso_fase);
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (progress / 100) * circumference;

  const title = themeData.headerTitle || "Plano de Crescimento";
  const highlightedTitle = title.replace(/Crescimento/i, "");

  const renderCronograma = () => (
    <section className={classes.section}>
      <h2 className={classes.sectionTitle}>Cronograma de Entregas Semanais</h2>
      <p className={classes.sectionLead}>Acompanhe cada fase, ação, responsável e entrega esperada.</p>
      <div className={classes.phaseList}>
        {(data.phases || []).map((phase) => (
          <article
            className={classes.phase}
            key={phase.id}
            style={{ "--phase-color": phase.color || "var(--proposal-primary)" }}
          >
            <div className={classes.phaseHead}>
              <div className={classes.phaseName}>
                <div className={classes.phaseIcon}>{phase.icon || "🚀"}</div>
                <div>
                  <strong>{phase.name}</strong>
                  <p>{phase.objective}</p>
                </div>
              </div>
              {phase.weeks && <span className={classes.phaseWeeks}>{phase.weeks}</span>}
            </div>
            {!!(phase.actions || []).length && (
              <div className={classes.actionGrid}>
                {phase.actions.map((action) => (
                  <div className={classes.action} key={action.id}>
                    <h4>{action.title}</h4>
                    <p>{[action.time, action.responsible].filter(Boolean).join(" • ")}</p>
                    {action.delivery && <p><strong>Entrega:</strong> {action.delivery}</p>}
                    {!!(action.tasks || []).length && (
                      <ul>
                        {action.tasks.filter(Boolean).slice(0, 6).map((task, index) => (
                          <li key={index}>{task}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );

  const renderDiagnostico = () => (
    <section className={classes.section}>
      <h2 className={classes.sectionTitle}>Diagnóstico Geral</h2>
      <p className={classes.sectionLead}>Onde estamos, quais gargalos atacaremos e por que o plano foi desenhado assim.</p>
      <div className={classes.grid}>
        {(data.diagnostico || []).map((item) => (
          <div className={classes.infoCard} key={item.id || item.title}>
            <div style={{ fontSize: 28 }}>{item.icon || "📌"}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderMetodo5s = () => (
    <section className={classes.section}>
      <h2 className={classes.sectionTitle}>Método 5S</h2>
      <p className={classes.sectionLead}>Base para deixar a operação organizada antes da aceleração comercial.</p>
      <div className={classes.grid}>
        {(data.metodo5s || []).map((item) => (
          <div
            className={classes.infoCard}
            key={`${item.numero}-${item.nome}`}
            style={{ "--card-color": item.color || "var(--proposal-primary)" }}
          >
            <div className={classes.fiveSNumber}>{item.numero}</div>
            <h3>{item.nome} - {item.titulo}</h3>
            <p>{item.descricao}</p>
            {!!(item.items || []).length && (
              <ul style={{ color: "#cbd5e1", margin: "12px 0 0 18px", fontSize: 13 }}>
                {item.items.map((text, index) => <li key={index}>{text}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  const renderKpis = () => (
    <section className={classes.section}>
      <h2 className={classes.sectionTitle}>KPIs de Sucesso</h2>
      <p className={classes.sectionLead}>Indicadores para acompanhar resultado, execução e tomada de decisão.</p>
      {(data.kpis || []).map((category) => (
        <div key={category.id || category.title} style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", color: "#f8fafc" }}>{category.icon || "📊"} {category.title}</h3>
          <div className={classes.grid}>
            {(category.items || []).map((item) => (
              <div className={classes.infoCard} key={item.id || item.label}>
                <div style={{ fontSize: 26 }}>{item.icon || "🎯"}</div>
                <h3>{item.value}</h3>
                <p>{item.label}{item.source ? ` • ${item.source}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );

  const renderScripts = () => (
    <section className={classes.section}>
      <h2 className={classes.sectionTitle}>Scripts Prontos para Uso</h2>
      <p className={classes.sectionLead}>Textos que ajudam o time a executar atendimento, follow-up e comunicação com consistência.</p>
      <div className={classes.grid}>
        {(data.scripts || []).map((script) => (
          <div className={classes.script} key={script.id || script.title}>
            <h3 style={{ margin: 0, color: "#f8fafc" }}>{script.icon || "💬"} {script.title}</h3>
            <pre>{script.text}</pre>
          </div>
        ))}
      </div>
    </section>
  );

  const renderOrcamento = () => (
    <section className={classes.section}>
      <h2 className={classes.sectionTitle}>Orçamento e Recursos</h2>
      <p className={classes.sectionLead}>Investimentos estimados, observações e recursos necessários para executar o plano.</p>
      <div style={{ overflowX: "auto" }}>
        <table className={classes.budgetTable}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Custo mensal</th>
              <th>Custo total</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            {(data.orcamento || []).map((item) => (
              <tr key={item.id || item.item}>
                <td>{item.item}</td>
                <td>{item.custoMensal || "-"}</td>
                <td>{item.custoTotal || "-"}</td>
                <td>{item.observacao || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActive = () => {
    if (activeTab === "diagnostico") return renderDiagnostico();
    if (activeTab === "metodo5s") return renderMetodo5s();
    if (activeTab === "kpis") return renderKpis();
    if (activeTab === "scripts") return renderScripts();
    if (activeTab === "orcamento") return renderOrcamento();
    return renderCronograma();
  };

  return (
    <div className={classes.shell}>
      <div className={classes.container}>
        <header className={classes.header}>
          <div>
            <div className={classes.brand}>
              <div className={classes.logoIcon}>
                {themeData.logoUrl ? <img src={themeData.logoUrl} alt="" /> : (themeData.headerIcon || "💙")}
              </div>
              <div>
                <h1 className={classes.title}>
                  {highlightedTitle}
                  {/Crescimento/i.test(title) ? <span>Crescimento</span> : null}
                </h1>
                <p className={classes.subtitle}>
                  {data.cliente || proposal?.clientName || "Cliente"} {themeData.headerSubtitle ? `• ${themeData.headerSubtitle}` : ""}
                </p>
              </div>
            </div>
            <div className={classes.badges}>
              <span className={classes.badge}>📍 {data.cidade || "Cidade não informada"}</span>
              <span className={classes.badge}>⏱ {data.dias_plano || 126} dias de plano</span>
            </div>
          </div>
          <div className={classes.progressBlock}>
            <div className={classes.progressWrap}>
              <svg className={classes.progressSvg} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--proposal-primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className={classes.progressText}>{progress}<small>%</small></div>
            </div>
            <span className={classes.progressLabel}>Progresso geral</span>
          </div>
        </header>

        <nav className={classes.nav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${classes.navButton} ${activeTab === tab.id ? classes.navButtonActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {renderActive()}

        <footer className={classes.footer}>
          <h2>{themeData.footerTitle || "Fase 2 - Visão de Futuro"}</h2>
          <p>{themeData.footerSubtitle}</p>
          <div className={classes.footerCards}>
            {(themeData.footerCards || []).map((card, index) => (
              <div className={classes.footerCard} key={`${card.title}-${index}`}>
                <div style={{ fontSize: 34 }}>{card.icon}</div>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </div>
            ))}
          </div>
          {themeData.footerQuote && (
            <div className={classes.quote}>
              "{themeData.footerQuote}" {themeData.footerQuoteAuthor ? `- ${themeData.footerQuoteAuthor}` : ""}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ProposalViewer;
