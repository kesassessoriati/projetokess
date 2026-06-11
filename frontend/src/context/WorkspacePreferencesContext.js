import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { AuthContext } from "./Auth/AuthContext";

const WorkspacePreferencesContext = createContext({
  preferences: {},
  menuOptions: [],
  loading: false,
  isMenuVisible: () => true,
  savePreferences: async () => {},
});

export const WorkspacePreferencesProvider = ({ children }) => {
  const { isAuth } = useContext(AuthContext);
  const [preferences, setPreferences] = useState({});
  const [menuOptions, setMenuOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/workspace/menu-preferences");
      setPreferences(data?.menus || {});
      setMenuOptions(Array.isArray(data?.options) ? data.options : []);
    } catch (err) {
      setPreferences({});
      setMenuOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuth) {
      loadPreferences();
    } else {
      setPreferences({});
      setMenuOptions([]);
    }
  }, [isAuth, loadPreferences]);

  const isMenuVisible = useCallback(
    (key) => {
      if (!key) return true;
      return preferences[key] !== false;
    },
    [preferences]
  );

  const savePreferences = useCallback(async (menus) => {
    setPreferences(menus || {});
    const { data } = await api.put("/workspace/menu-preferences", { menus });
    setPreferences(data?.menus || {});
    setMenuOptions(Array.isArray(data?.options) ? data.options : []);
    return data?.menus || {};
  }, []);

  const value = useMemo(
    () => ({ preferences, menuOptions, loading, isMenuVisible, savePreferences, reloadPreferences: loadPreferences }),
    [preferences, menuOptions, loading, isMenuVisible, savePreferences, loadPreferences]
  );

  return (
    <WorkspacePreferencesContext.Provider value={value}>
      {children}
    </WorkspacePreferencesContext.Provider>
  );
};

export const useWorkspacePreferences = () => useContext(WorkspacePreferencesContext);
