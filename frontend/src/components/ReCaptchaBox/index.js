import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@material-ui/core";
import { getEnvVariable } from "../../config";

const SCRIPT_ID = "google-recaptcha-api";
const SITE_KEY = getEnvVariable("REACT_APP_RECAPTCHA_SITE_KEY", "");

const loadRecaptchaScript = () =>
  new Promise((resolve, reject) => {
    if (window.grecaptcha?.render) {
      resolve(window.grecaptcha);
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.grecaptcha));
      existingScript.addEventListener("error", reject);
      return;
    }

    window.__recaptchaOnLoad = () => resolve(window.grecaptcha);

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.body.appendChild(script);
  });

const ReCaptchaBox = ({ onChange, onReady, resetSignal }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) {
      onReady?.(false);
      return undefined;
    }

    let mounted = true;

    loadRecaptchaScript()
      .then((grecaptcha) => {
        if (!mounted || !containerRef.current || widgetIdRef.current !== null) return;

        widgetIdRef.current = grecaptcha.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onChange?.(token),
          "expired-callback": () => onChange?.(""),
          "error-callback": () => {
            onChange?.("");
            setLoadFailed(true);
          }
        });

        onReady?.(true);
      })
      .catch(() => {
        if (!mounted) return;
        setLoadFailed(true);
        onReady?.(true);
      });

    return () => {
      mounted = false;
    };
  }, [onChange, onReady]);

  useEffect(() => {
    if (!SITE_KEY || widgetIdRef.current === null || !window.grecaptcha?.reset) return;
    window.grecaptcha.reset(widgetIdRef.current);
    onChange?.("");
  }, [resetSignal, onChange]);

  if (!SITE_KEY) return null;

  return (
    <Box mt={2} mb={1}>
      <div ref={containerRef} />
      {loadFailed && (
        <Typography variant="caption" color="error">
          Nao foi possivel carregar a verificacao de seguranca. Atualize a pagina e tente novamente.
        </Typography>
      )}
    </Box>
  );
};

export const isRecaptchaEnabled = Boolean(SITE_KEY);
export default ReCaptchaBox;
