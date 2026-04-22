import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import moment from "moment";

import { AuthContext } from "./Auth/AuthContext";
import usePlans from "../hooks/usePlans";

const defaultState = {
  loading: true,
  planActive: true,
  campaigns: false,
  openAi: false,
  aiEnabled: false,
  aiAgent: false,
  aiDailyCredits: 0,
  kanban: false,
  internalChat: false,
  schedules: false,
  integrations: false,
  externalApi: false,
  notifica_mehub: false,
  whatsapp_whatsmeow: false,
  whatsapp_whaleys: false,
  email: false,
  gestor_financas: false,
  gestor_financeiro_ia: false,
  meetings: false,
  firecrawl: false,
  propostas: false,
  followUps: false,
};

const PlanPermissionsContext = createContext({
  ...defaultState,
  canAccess: () => false,
});

export const PlanPermissionsProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { getPlanCompany } = usePlans();

  const [state, setState] = useState(defaultState);

  useEffect(() => {
    let isMounted = true;

    const loadPlan = async () => {
      if (!user?.companyId) {
        setState((prev) => ({ ...defaultState, loading: false }));
        return;
      }

      try {
        const planConfigs = await getPlanCompany(undefined, user.companyId);
        if (!isMounted) return;

        const plan = planConfigs?.plan || {};
        if (planConfigs?.plan) {
          // Plano ilimitado: sempre ativo independente de datas
          const isUnlimited = user.company?.billing_cycle === "unlimited" || user.company?.recurrence === "Ilimitado";
          // Se a empresa estiver ativa, plano permanece ativo mesmo com fatura vencida
          const isExpired = moment().isBefore(user.company?.expiration_date || user.company?.dueDate);
          const planActive = isUnlimited || user.company?.status ? true : isExpired;
          
          const aiEnabled = typeof plan.aiEnabled === "boolean" ? Boolean(plan.aiEnabled) : Boolean(plan.useOpenAi);
          const aiAgent = typeof plan.aiAgentEnabled === "boolean" ? Boolean(plan.aiAgentEnabled) : aiEnabled;
          setState({
            loading: false,
            planActive,
            campaigns: Boolean(plan.useCampaigns),
            openAi: aiEnabled,
            aiEnabled,
            aiAgent,
            aiDailyCredits: Number(plan.aiDailyCredits ?? plan.aiCredits ?? 0),
            kanban: Boolean(plan.useKanban),
            internalChat: Boolean(plan.useInternalChat),
            schedules: Boolean(plan.useSchedules),
            integrations: Boolean(plan.useIntegrations),
            externalApi: Boolean(plan.useExternalApi),
            notifica_mehub: Boolean(plan.notifica_mehub),
            whatsapp_whatsmeow: Boolean(plan.whatsapp_whatsmeow),
            whatsapp_whaleys: Boolean(plan.whatsapp_whaleys),
            email: Boolean(plan.email),
            gestor_financas: Boolean(plan.gestor_financas),
            gestor_financeiro_ia: Boolean(plan.gestor_financeiro_ia),
            meetings: Boolean(plan.useMeetings),
            firecrawl: Boolean(plan.useFirecrawl),
            propostas: Boolean(plan.usePropostas),
            followUps: Boolean(plan.useFollowUps),
          });
        } else {
          setState((prev) => ({ ...defaultState, loading: false }));
        }
      } catch (err) {
        if (isMounted) {
          setState((prev) => ({ ...defaultState, loading: false }));
        }
      }
    };

    loadPlan();

    return () => {
      isMounted = false;
    };
  }, [user?.companyId, user?.company?.expiration_date, user?.company?.dueDate, user?.company?.status, user?.company?.billing_cycle, user?.company?.recurrence]);

  const value = useMemo(() => {
    const canAccess = (featureKey) => {
      if (!featureKey) return true;
      return Boolean(state[featureKey]);
    };

    return { ...state, canAccess };
  }, [state]);

  return (
    <PlanPermissionsContext.Provider value={value}>
      {children}
    </PlanPermissionsContext.Provider>
  );
};

export const usePlanPermissions = () => {
  return useContext(PlanPermissionsContext);
};

export default PlanPermissionsContext;
