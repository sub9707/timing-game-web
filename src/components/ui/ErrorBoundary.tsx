import { Component, type ReactNode } from 'react';
import { tr } from '../../i18n';

const SETTINGS_KEY = 'timer-game:settings:v1';

/** 화면이 깨졌을 때 — 새로고침 또는 설정만 초기화(지금 설정은 따로 보관)해서 다시 시작 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  private resetSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) localStorage.setItem(`${SETTINGS_KEY}:broken-${Date.now()}`, raw);
      localStorage.removeItem(SETTINGS_KEY);
    } catch {
      /* storage unavailable */
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <h1>{tr('문제가 생겼어요')}</h1>
          <p>{tr('화면을 그리다 오류가 났어요. 새로고침해도 계속되면 설정만 초기화해 보세요 (지금 설정은 따로 보관돼요).')}</p>
          <pre>{String(this.state.error.message || this.state.error)}</pre>
          <div className="crash-actions">
            <button className="primary-btn" onClick={() => location.reload()}>
              {tr('새로고침')}
            </button>
            <button className="ghost-btn" onClick={this.resetSettings}>
              {tr('설정 초기화하고 다시 시작')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
