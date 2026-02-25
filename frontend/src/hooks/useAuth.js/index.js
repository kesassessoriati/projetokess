import { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
// import { useDate } from "../../hooks/useDate";
import moment from "moment";

const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});
  const [loginOrigin, setLoginOrigin] = useState(
    () => localStorage.getItem("loginOrigin") || "default"
  );

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Tenta fazer parse se for string JSON
          const parsedToken = token.startsWith('"') ? JSON.parse(token) : token;
          config.headers["Authorization"] = `Bearer ${parsedToken}`;
          setIsAuth(true);
        } catch (e) {
          // Se falhar, usa o token direto
          config.headers["Authorization"] = `Bearer ${token}`;
          setIsAuth(true);
        }
      }
      return config;
    },
    (error) => {
      Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      if (error?.response?.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;

        const { data } = await api.post("/auth/refresh_token");
        if (data) {
          localStorage.setItem("token", data.token);
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
        }
        return api(originalRequest);
      }
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        api.defaults.headers.Authorization = undefined;
        setIsAuth(false);
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          setIsAuth(true);
          setUser(data.user);
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("companyId", data.user.company.id);
        } catch (err) {
          toastError(err);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    // Socket removido para SocketProvider dedicado
  }, [user]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      const {
        user: { company },
      } = data;

      if (
        has(company, "companieSettings") &&
        isArray(company.companieSettings[0])
      ) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "campaignsEnabled"
        );
        if (setting && setting.value === "true") {
          localStorage.setItem("cshow", null); //regra pra exibir campanhas
        }
      }

      if (
        has(company, "companieSettings") &&
        isArray(company.companieSettings[0])
      ) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "sendSignMessage"
        );

        const signEnable = setting.value === "enable";

        if (setting && setting.value === "enabled") {
          localStorage.setItem("sendSignMessage", signEnable); //regra pra exibir campanhas
        }
      }
      localStorage.setItem("profileImage", data.user.profileImage); //regra pra exibir imagem contato

      moment.locale("pt-br");
      let dueDate;
      if (data.user.company.id === 1) {
        dueDate = "2999-12-31T00:00:00.000Z";
      } else {
        dueDate = data.user.company.dueDate;
      }
      const hoje = moment(moment()).format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(dueDate).diff(moment(moment()).format());

      var before = moment(moment().format()).isBefore(dueDate);
      var dias = moment.duration(diff).asDays();

      // Se a empresa estiver ativa, permite login mesmo com fatura vencida
      const companyStatus = data.user.company?.status;
      const allowLogin = companyStatus ? true : before;

      if (allowLogin) {
        localStorage.setItem("token", data.token);
        // localStorage.setItem("public-token", JSON.stringify(data.user.token));
        // localStorage.setItem("companyId", companyId);
        // localStorage.setItem("userId", id);
        localStorage.setItem("companyDueDate", vencimento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("companyId", data.user.company.id);
        const origin = localStorage.getItem("loginOrigin") || "default";
        setLoginOrigin(origin);
        toast.success(i18n.t("auth.toasts.success"));
        if (Math.round(dias) < 5) {
          toast.warn(
            `Sua assinatura vence em ${Math.round(dias)} ${Math.round(dias) === 1 ? "dia" : "dias"
            } `
          );
        }

        // // Atraso para garantir que o cache foi limpo
        // setTimeout(() => {
        //   window.location.reload(true); // Recarregar a página
        // }, 1000);

        history.push("/atendimentos");
        setLoading(false);

        // Se for login mobile, autenticar no WebView
        if (origin === "mobile") {
          try {
            await api.post("/mobile/auth/webview", { token: data.token });
          } catch (err) {
            console.error("Erro ao autenticar WebView mobile:", err);
          }
        }
      } else {
        localStorage.setItem("token", data.token);
        // localStorage.setItem("companyId", companyId);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        const origin = localStorage.getItem("loginOrigin") || "default";
        setLoginOrigin(origin);
        toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
        history.push("/financeiro");
        setLoading(false);
      }
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const origin = localStorage.getItem("loginOrigin") || "default";

    try {
      // socket.disconnect();
      await api.delete("/auth/logout");
      setIsAuth(false);
      setUser({});
      localStorage.removeItem("token");
      localStorage.removeItem("cshow");
      localStorage.removeItem("userId");
      localStorage.removeItem("companyId");
      // localStorage.removeItem("public-token");
      localStorage.removeItem("loginOrigin");
      api.defaults.headers.Authorization = undefined;
      setLoading(false);
      setLoginOrigin("default");
      if (origin === "mobile") {
        history.push("/mobile-login");
      } else {
        history.push("/login");
      }
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleSetLoginOrigin = (origin = "default") => {
    localStorage.setItem("loginOrigin", origin);
    setLoginOrigin(origin);
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      console.log(data);
      return data;
    } catch (_) {
      return null;
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    handleSetLoginOrigin,
    isMobileSession: loginOrigin === "mobile",
    getCurrentUserInfo,
    socket: null, // Mantido null para evitar quebra de props mas forçar refatoração
  };
};

export default useAuth;
