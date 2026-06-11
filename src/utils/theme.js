const STORAGE_KEY = 'hac_theme_settings';

export const DEFAULT_THEME_SETTINGS = {
  preset: 'dark',
  customBase: 'dark',
  backgroundImageUrl: '',
};

export function loadThemeSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_THEME_SETTINGS,
      ...parsed,
      preset: ['dark', 'light', 'custom'].includes(parsed?.preset) ? parsed.preset : 'dark',
      customBase: parsed?.customBase === 'light' ? 'light' : 'dark',
      backgroundImageUrl: typeof parsed?.backgroundImageUrl === 'string' ? parsed.backgroundImageUrl : '',
    };
  } catch {
    return { ...DEFAULT_THEME_SETTINGS };
  }
}

export function saveThemeSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resolveThemeAppearance(settings) {
  if (settings.preset === 'custom') {
    const url = settings.backgroundImageUrl?.trim();
    return {
      appearance: settings.customBase === 'light' ? 'light' : 'dark',
      useBackgroundImage: !!url,
      backgroundImageUrl: url || '',
    };
  }
  return {
    appearance: settings.preset === 'light' ? 'light' : 'dark',
    useBackgroundImage: false,
    backgroundImageUrl: '',
  };
}

export function applyTheme(settings) {
  const root = document.documentElement;
  const { appearance, useBackgroundImage, backgroundImageUrl } = resolveThemeAppearance(settings);

  root.dataset.theme = appearance;
  root.dataset.themePreset = settings.preset === 'custom' ? 'custom' : 'default';
  root.dataset.bgCustom = useBackgroundImage ? 'true' : 'false';

  if (useBackgroundImage) {
    const safeUrl = backgroundImageUrl.replace(/"/g, '\\"');
    root.style.setProperty('--app-bg-image', `url("${safeUrl}")`);
  } else {
    root.style.removeProperty('--app-bg-image');
  }

  const overlay =
    appearance === 'light' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(11, 15, 25, 0.72)';
  root.style.setProperty('--app-bg-overlay', useBackgroundImage ? overlay : 'transparent');
}
