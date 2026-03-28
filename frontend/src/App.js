import React, { useState, useEffect, useMemo } from "react";
import api from "./services/api";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";
import { ptBR } from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./layout/themeContext";
import { ActiveMenuProvider } from "./context/ActiveMenuContext";
import Favicon from "react-favicon";
import { getBackendUrl } from "./config";
import Routes from "./routes";
import defaultLogoLight from "./assets/logo.png";
import defaultLogoDark from "./assets/logo-black.png";
import defaultLogoFavicon from "./assets/favicon.ico";
import useSettings from "./hooks/useSettings";
import { SystemAlertProvider } from "./components/SystemAlert";
import ErrorBoundary from "./components/ErrorBoundary";
import { applyCSSVariables, primitives } from "./styles/designTokens";

const queryClient = new QueryClient();

const App = () => {
  const [locale, setLocale] = useState();
  const appColorLocalStorage = localStorage.getItem("primaryColorLight") || localStorage.getItem("primaryColorDark") || "#065183";
  const appNameLocalStorage = localStorage.getItem("appName") || "TendZap";

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const preferredTheme = window.localStorage.getItem("preferredTheme");
  const [mode, setMode] = useState(preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light");
  const [primaryColorLight, setPrimaryColorLight] = useState(appColorLocalStorage);
  const [primaryColorDark, setPrimaryColorDark] = useState(appColorLocalStorage);
  const [appLogoLight, setAppLogoLight] = useState(defaultLogoLight);
  const [appLogoDark, setAppLogoDark] = useState(defaultLogoDark);
  const [appLogoFavicon, setAppLogoFavicon] = useState(defaultLogoFavicon);
  const [appName, setAppName] = useState(appNameLocalStorage);
  const { getPublicSetting } = useSettings();

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          window.localStorage.setItem("preferredTheme", newMode); // Persistindo o tema no localStorage
          return newMode;
        });
      },
      setPrimaryColorLight,
      setPrimaryColorDark,
      setAppLogoLight,
      setAppLogoDark,
      setAppLogoFavicon,
      setAppName,
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appName,
      mode,
    }),
    [appLogoLight, appLogoDark, appLogoFavicon, appName, mode]
  );

  const theme = useMemo(
    () =>
      createTheme(
        {
          typography: {
            fontFamily: [
              '"Inter"',
              '"Roboto"',
              '"Segoe UI"',
              '"Helvetica Neue"',
              'Arial',
              'sans-serif'
            ].join(','),

            // Configurações para diferentes elementos
            h1: {
              fontSize: '2.125rem',
              fontWeight: 600,
              letterSpacing: '-0.01562em'
            },
            h2: {
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.00833em'
            },
            h3: {
              fontSize: '1.25rem',
              fontWeight: 500,
              letterSpacing: '0em'
            },
            h4: {
              fontSize: '1.125rem',
              fontWeight: 500,
              letterSpacing: '0.00735em'
            },
            h5: {
              fontSize: '1rem',
              fontWeight: 500,
              letterSpacing: '0em'
            },
            h6: {
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.0075em'
            },
            body1: {
              fontSize: '1rem',
              fontWeight: 400,
              letterSpacing: '0.00938em',
              lineHeight: 1.5
            },
            body2: {
              fontSize: '0.875rem',
              fontWeight: 400,
              letterSpacing: '0.01071em',
              lineHeight: 1.43
            },
            button: {
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.02857em',
              textTransform: 'none' // Remove o uppercase padrão dos botões
            },
            caption: {
              fontSize: '0.75rem',
              fontWeight: 400,
              letterSpacing: '0.03333em'
            },
            overline: {
              fontSize: '0.625rem',
              fontWeight: 400,
              letterSpacing: '0.08333em',
              textTransform: 'uppercase'
            }
          },
          scrollbarStyles: {
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
              backgroundColor: mode === "light" ? primaryColorLight : primaryColorDark,
            },
          },
          scrollbarStylesSoft: {
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: mode === "light" ? "#F3F3F3" : "#333333",
            },
          },
          palette: {
            type: mode,
            primary: { main: mode === "light" ? primaryColorLight : primaryColorDark },

            // Standard MUI background/text/divider — drives Paper, CssBaseline, etc.
            background: {
              default: mode === "light" ? "#f9fafb" : "#1a1a2e",
              paper:   mode === "light" ? "#ffffff"  : "#252540",
            },
            text: {
              primary:   mode === "light" ? "#111827" : "#f9fafb",
              secondary: mode === "light" ? "#6b7280" : "#9ca3af",
              disabled:  mode === "light" ? "#9ca3af" : "#6b7280",
              hint:      mode === "light" ? "#9ca3af" : "#6b7280",
            },
            divider: mode === "light" ? "#e5e7eb" : "#374151",

            // Status colors
            success: { main: mode === "light" ? primitives.green[500]  : primitives.green[400],  contrastText: "#fff" },
            warning: { main: mode === "light" ? primitives.yellow[500] : primitives.yellow[400], contrastText: "#fff" },
            error:   { main: mode === "light" ? primitives.red[500]    : primitives.red[400],    contrastText: "#fff" },
            info:    { main: primitives.blue[500], contrastText: "#fff" },

            // ── Legacy custom keys (preserved for backward-compat) ──────────
            textPrimary:  mode === "light" ? primaryColorLight : primaryColorDark,
            borderPrimary: mode === "light" ? primaryColorLight : primaryColorDark,
            dark:  { main: mode === "light" ? "#333333" : "#F3F3F3" },
            light: { main: mode === "light" ? "#F3F3F3" : "#333333" },
            fontColor:          mode === "light" ? primaryColorLight : primaryColorDark,
            tabHeaderBackground: mode === "light" ? "#EEE" : "#555",
            optionsBackground:   mode === "light" ? "#fafafa" : "#2d2d4a",
            fancyBackground:     mode === "light" ? "#fafafa" : "#2d2d4a",
            total:               mode === "light" ? "#fff"    : "#252540",
            messageIcons:        mode === "light" ? "#6b7280" : "#d1d5db",
            inputBackground:     mode === "light" ? "#ffffff" : "#2d2d4a",
            barraSuperior:       mode === "light" ? primaryColorLight : "#2d2d4a",

            // ── New semantic keys (design token references) ──────────────────
            // Backgrounds
            bgDefault:      mode === "light" ? "#f9fafb" : "#1a1a2e",
            bgPaper:        mode === "light" ? "#ffffff"  : "#252540",
            bgSurface:      mode === "light" ? "#f3f4f6" : "#2d2d4a",
            bgSurfaceAlpha: mode === "light" ? "rgba(255,255,255,0.5)" : "rgba(37,37,64,0.6)",
            bgInverse:      mode === "light" ? "#111827" : "#f3f4f6",
            bgHover:        mode === "light" ? "#f3f4f6" : "rgba(255,255,255,0.05)",
            bgActive:       mode === "light" ? "#e5e7eb" : "rgba(255,255,255,0.1)",

            // Borders
            borderDefault: mode === "light" ? "#e5e7eb" : "#374151",
            borderStrong:  mode === "light" ? "#d1d5db" : "#4b5563",
            borderFocus:   mode === "light" ? primitives.blue[500] : primitives.blue[400],

            // Navigation
            quickNavBg:    mode === "light" ? "#111827" : "#1f2937",
            quickNavHover: mode === "light" ? "#1f2937" : "#374151",
            quickNavText:  "#ffffff",

            // Secondary bar
            secondaryBarBg:     mode === "light" ? "rgba(255,255,255,0.5)"  : "rgba(37,37,64,0.7)",
            secondaryBarBorder: mode === "light" ? "rgba(0,0,0,0.05)"       : "rgba(255,255,255,0.06)",

            // Search
            searchBg:     mode === "light" ? "#f3f4f6" : "#2d2d4a",
            searchBorder: mode === "light" ? "#e5e7eb"  : "#374151",
            searchText:   mode === "light" ? "#111827"  : "#f3f4f6",

            // Dropdown
            dropdownBg:     mode === "light" ? "#ffffff"  : "#252540",
            dropdownBorder: mode === "light" ? "#e5e7eb"  : "#374151",
            dropdownHover:  mode === "light" ? "#f3f4f6"  : "#2d2d4a",
            dropdownText:   mode === "light" ? "#111827"  : "#f3f4f6",
            dropdownMuted:  mode === "light" ? "#6b7280"  : "#9ca3af",
          },
          mode,
          appLogoLight,
          appLogoDark,
          appLogoFavicon,
          appName,
          calculatedLogoDark: () => {
            if (appLogoDark === defaultLogoDark && appLogoLight !== defaultLogoLight) {
              return appLogoLight;
            }
            return appLogoDark;
          },
          calculatedLogoLight: () => {
            if (appLogoDark !== defaultLogoDark && appLogoLight === defaultLogoLight) {
              return appLogoDark;
            }
            return appLogoLight;
          },
        },
        locale
      ),
    [appLogoLight, appLogoDark, appLogoFavicon, appName, locale, mode, primaryColorDark, primaryColorLight]
  );

  useEffect(() => {
    window.localStorage.setItem("preferredTheme", mode);
  }, [mode]);

  useEffect(() => {
    console.log("|=========== handleSaveSetting ==========|")
    console.log("APP START")
    console.log("|========================================|")


    getPublicSetting("primaryColorLight")
      .then((color) => {
        setPrimaryColorLight(color || "#0000FF");
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("primaryColorDark")
      .then((color) => {
        setPrimaryColorDark(color || "#39ACE7");
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoLight")
      .then((file) => {
        setAppLogoLight(file ? getBackendUrl() + "/public/" + file : defaultLogoLight);
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoDark")
      .then((file) => {
        setAppLogoDark(file ? getBackendUrl() + "/public/" + file : defaultLogoDark);
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoFavicon")
      .then((file) => {
        setAppLogoFavicon(file ? getBackendUrl() + "/public/" + file : defaultLogoFavicon);
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appName")
      .then((name) => {
        setAppName(name || "TendZap");
      })
      .catch((error) => {
        console.log("!==== Erro ao carregar temas: ====!", error);
        setAppName("CRM");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const resolvedPrimary = mode === "light" ? primaryColorLight : primaryColorDark;
    applyCSSVariables(mode, resolvedPrimary);
  }, [primaryColorLight, primaryColorDark, mode]);

  // Atualiza o título da página com o nome do sistema
  useEffect(() => {
    if (appName) {
      document.title = appName;
    }
  }, [appName]);

  useEffect(() => {
    async function fetchVersionData() {
      try {
        const response = await api.get("/version");
        const { data } = response;
        window.localStorage.setItem("frontendVersion", data.version);
      } catch (error) {
        console.log("Error fetching data", error);
      }
    }
    fetchVersionData();
  }, []);

  return (
    <>
      <Favicon url={appLogoFavicon && appLogoFavicon !== defaultLogoFavicon ? appLogoFavicon : defaultLogoFavicon} />
      <ErrorBoundary>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
              <SystemAlertProvider>
                <ActiveMenuProvider>
                  <Routes />
                </ActiveMenuProvider>
              </SystemAlertProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </ErrorBoundary>
    </>
  );
};

export default App;
