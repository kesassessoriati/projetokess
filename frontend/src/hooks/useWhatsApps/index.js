import { useState, useEffect, useReducer, useContext, useRef } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import useSafeApi from "../useSafeApi";
import { useSocket } from "../../context/SocketContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_WHATSAPPS") {
    return [...action.payload];
  }

  if (action.type === "UPDATE_WHATSAPPS") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsApp.id);

    if (whatsAppIndex !== -1) {
      state[whatsAppIndex] = whatsApp;
      return [...state];
    } else {
      return [whatsApp, ...state];
    }
  }

  if (action.type === "UPDATE_SESSION") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => s.id === whatsApp.id);

    if (whatsAppIndex !== -1) {
      state[whatsAppIndex] = {
        ...state[whatsAppIndex],
        status: whatsApp.status,
        updatedAt: whatsApp.updatedAt,
        qrcode: whatsApp.qrcode,
        retries: whatsApp.retries
      };
      return [...state];
    }
    return state;
  }

  if (action.type === "DELETE_WHATSAPPS") {
    const whatsAppId = action.payload;
    return state.filter((s) => s.id !== whatsAppId);
  }

  if (action.type === "RESET") {
    return [];
  }
  return state;
};

const useWhatsApps = () => {
  const [whatsApps, dispatch] = useReducer(reducer, []);
  const { user } = useContext(AuthContext);
  const { isReady, on } = useSocket();
  const isMounted = useRef(true);

  const { loading, error, request: fetchWhatsApps } = useSafeApi("/whatsapp/?session=0", {
    manual: true
  });

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await fetchWhatsApps();
      if (data && isMounted.current) {
        dispatch({ type: "LOAD_WHATSAPPS", payload: data });
      }
    };
    load();
  }, [fetchWhatsApps]);

  useEffect(() => {
    if (!isReady || !user.companyId) return;

    const companyId = user.companyId;

    const cleanupWhatsapp = on(`company-${companyId}-whatsapp`, (data) => {
      if (data.action === "update") {
        dispatch({ type: "UPDATE_WHATSAPPS", payload: data.whatsapp });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
      }
    });

    const cleanupSession = on(`company-${companyId}-whatsappSession`, (data) => {
      if (data.action === "update") {
        dispatch({ type: "UPDATE_SESSION", payload: data.session });
      }
    });

    return () => {
      cleanupWhatsapp();
      cleanupSession();
    };
  }, [isReady, user.companyId, on]);

  return { whatsApps, loading, error };
};

export default useWhatsApps;
