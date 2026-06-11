import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadThemeSettings,
  saveThemeSettings,
  applyTheme,
  DEFAULT_THEME_SETTINGS,
} from '../utils/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState(loadThemeSettings);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveThemeSettings(next);
      return next;
    });
  }, []);

  const setPreset = useCallback((preset) => {
    updateSettings({ preset });
  }, [updateSettings]);

  const resetTheme = useCallback(() => {
    const next = { ...DEFAULT_THEME_SETTINGS };
    saveThemeSettings(next);
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, setPreset, resetTheme }),
    [settings, updateSettings, setPreset, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
