import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "erp_ui_preferences_v1";

const ALLOWED_DENSITIES = ["comfortable", "compact"];
const ALLOWED_VIEW_MODES = ["table", "grid", "cards"];

const UIPreferencesContext = createContext(null);

export const useUIPreferences = () => {
  const context = useContext(UIPreferencesContext);
  if (!context) {
    throw new Error("useUIPreferences must be used within a UIPreferencesProvider");
  }
  return context;
};

export function UIPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          density: ALLOWED_DENSITIES.includes(parsed.density) ? parsed.density : "comfortable",
          viewMode: ALLOWED_VIEW_MODES.includes(parsed.viewMode) ? parsed.viewMode : "table",
        };
      }
    } catch {
      
    }
    return { density: "comfortable", viewMode: "table" };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      
    }
  }, [preferences]);

  const setDensity = (density) => {
    if (ALLOWED_DENSITIES.includes(density)) {
      setPreferences((prev) => ({ ...prev, density }));
    }
  };

  const toggleDensity = () => {
    setPreferences((prev) => ({
      ...prev,
      density: prev.density === "comfortable" ? "compact" : "comfortable",
    }));
  };

  const setViewMode = (viewMode) => {
    if (ALLOWED_VIEW_MODES.includes(viewMode)) {
      setPreferences((prev) => ({ ...prev, viewMode }));
    }
  };

  return (
    <UIPreferencesContext.Provider
      value={{
        density: preferences.density,
        viewMode: preferences.viewMode,
        setDensity,
        toggleDensity,
        setViewMode,
      }}
    >
      {children}
    </UIPreferencesContext.Provider>
  );
}

export default UIPreferencesContext;
