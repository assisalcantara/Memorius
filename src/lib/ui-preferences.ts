export interface UIPreferences {
  sidebarCollapsed: boolean;
  dashboardFilter: "HOJE" | "7_DIAS" | "30_DIAS" | "90_DIAS" | "ANO_ATUAL";
  theme: "light" | "dark" | "system";
}

const DEFAULT_PREFERENCES: UIPreferences = {
  sidebarCollapsed: false,
  dashboardFilter: "30_DIAS",
  theme: "light",
};

export const uiPreferences = {
  getPreferences(): UIPreferences {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
      const stored = localStorage.getItem("legacyflow_ui_preferences");
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn("Failed to read UI preferences:", e);
    }
    return DEFAULT_PREFERENCES;
  },

  savePreferences(prefs: UIPreferences): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("legacyflow_ui_preferences", JSON.stringify(prefs));
    } catch (e) {
      console.warn("Failed to save UI preferences:", e);
    }
  },

  updatePreference<K extends keyof UIPreferences>(key: K, value: UIPreferences[K]): UIPreferences {
    const current = this.getPreferences();
    const updated = { ...current, [key]: value };
    this.savePreferences(updated);
    return updated;
  }
};
