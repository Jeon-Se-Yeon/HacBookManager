import React, { useMemo } from 'react';
import { Palette, Sun, Moon, ImageIcon, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { resolveThemeAppearance } from '../utils/theme';

export default function ThemeSettings() {
  const { settings, updateSettings, setPreset, resetTheme } = useTheme();
  const resolved = useMemo(() => resolveThemeAppearance(settings), [settings]);
  const isCustom = settings.preset === 'custom';

  return (
    <div className="theme-settings animate-fade-in">
      <div className="glass-panel theme-settings-header">
        <Palette size={22} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>테마 설정</h2>
          <p>기본 라이트/다크 테마 또는 배경 이미지가 있는 커스텀 테마를 선택할 수 있습니다.</p>
        </div>
      </div>

      <section className="glass-panel theme-settings-section">
        <h3>기본 테마</h3>
        <p className="theme-settings-desc">단색 배경과 기본 글래스 UI 스타일이 적용됩니다.</p>
        <div className="theme-preset-grid">
          <button
            type="button"
            className={`theme-preset-card ${!isCustom && settings.preset === 'light' ? 'is-active' : ''}`}
            onClick={() => setPreset('light')}
          >
            <Sun size={22} />
            <span>라이트</span>
          </button>
          <button
            type="button"
            className={`theme-preset-card ${!isCustom && settings.preset === 'dark' ? 'is-active' : ''}`}
            onClick={() => setPreset('dark')}
          >
            <Moon size={22} />
            <span>다크</span>
          </button>
        </div>
      </section>

      <section className="glass-panel theme-settings-section">
        <h3>커스텀 테마</h3>
        <p className="theme-settings-desc">
          배경 이미지 URL을 지정하고, 그 위에 올라갈 UI 색상(라이트/다크)을 선택합니다.
        </p>

        <div className="theme-custom-toggle">
          <button
            type="button"
            className={`glass-button ${isCustom ? 'active' : ''}`}
            onClick={() => setPreset('custom')}
          >
            <ImageIcon size={16} />
            <span>커스텀 테마 사용</span>
          </button>
        </div>

        {isCustom && (
          <div className="theme-custom-fields">
            <div className="theme-settings-field">
              <label>배경 이미지 URL</label>
              <input
                type="url"
                className="glass-input"
                value={settings.backgroundImageUrl}
                onChange={(e) => updateSettings({ backgroundImageUrl: e.target.value })}
                placeholder="https://example.com/background.jpg"
              />
            </div>

            <div className="theme-settings-field">
              <label>UI 색상 (오버레이)</label>
              <div className="theme-preset-grid theme-preset-grid--compact">
                <button
                  type="button"
                  className={`theme-preset-card ${settings.customBase === 'light' ? 'is-active' : ''}`}
                  onClick={() => updateSettings({ customBase: 'light' })}
                >
                  <Sun size={18} />
                  <span>라이트 UI</span>
                </button>
                <button
                  type="button"
                  className={`theme-preset-card ${settings.customBase === 'dark' ? 'is-active' : ''}`}
                  onClick={() => updateSettings({ customBase: 'dark' })}
                >
                  <Moon size={18} />
                  <span>다크 UI</span>
                </button>
              </div>
            </div>

            {!resolved.useBackgroundImage && (
              <p className="theme-settings-warning">배경 이미지 URL을 입력하면 미리보기가 적용됩니다.</p>
            )}

            <div
              className="theme-preview"
              data-appearance={resolved.appearance}
              style={
                resolved.useBackgroundImage
                  ? { backgroundImage: `url("${settings.backgroundImageUrl.trim()}")` }
                  : undefined
              }
            >
              <div className="theme-preview-overlay" />
              <div className="theme-preview-card glass-panel">
                <span className="theme-preview-label">미리보기</span>
                <p>서적 카드 · 버튼 · 텍스트 색상</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="theme-settings-footer">
        <button type="button" className="glass-button" onClick={resetTheme}>
          <RotateCcw size={14} />
          <span>기본값으로 초기화 (다크)</span>
        </button>
      </div>
    </div>
  );
}
