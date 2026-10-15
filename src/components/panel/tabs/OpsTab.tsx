// 운영 탭: 송출 창 · 잠금 · 커서 · 이미지 최적화 · 앱 설치 · 저장 공간 · 자동 백업
import { useEffect, useState } from 'react';
import { optimizeEnabled, setOptimizeEnabled } from '../../../storage/optimize';
import { MonitorIcon } from '../../ui/Icons';
import { usePanel } from '../context';
import { Hint, Section, Segmented, Toggle } from '../controls';
import { lang, setLang, tr, type Lang } from '../../../i18n';

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

export function OpsTab() {
  const { app, doc } = usePanel();
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [optimize, setOptimize] = useState(optimizeEnabled);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => e.usage !== undefined && e.quota && setUsage({ used: e.usage, quota: e.quota }));
  }, [doc.backups]);

  const pinOk = /^\d{4,8}$/.test(pin) && pin === pin2;

  return (
    <>
      <Section title={tr('송출 창')} hint={tr('관객 화면(프로젝터·OBS)은 송출 창으로, 조작은 이 창에서 해요')} aside={app.outputs ? tr('{0}개 연결됨', app.outputs) : tr('연결 없음')}>
        <button className="ghost-btn with-icon" onClick={app.openOutput}>
          <MonitorIcon />
          {tr('송출 창 열기')}
        </button>
        <Hint>{tr('송출 창을 다른 모니터로 옮긴 뒤 F11 로 전체화면 · 송출 창에서 누른 키도 이 창으로 전달돼요')}</Hint>
      </Section>

      <Section title={tr('잠금')} hint={tr('행사 중 관객이 설정을 열지 못하게 PIN 을 걸어요')} aside={app.lock.locked ? tr('잠김') : app.lock.hasPin ? tr('PIN 있음') : tr('없음')}>
        {app.lock.hasPin ? (
          <div className="row-2">
            <button className="primary-btn" onClick={() => app.lock.relock()}>
              {tr('지금 잠그기')}
            </button>
            <button className="ghost-btn" onClick={() => app.lock.forget()}>
              {tr('PIN 지우기')}
            </button>
          </div>
        ) : (
          <>
            <div className="row-2">
              <input className="text-input" type="password" inputMode="numeric" placeholder={tr('PIN (숫자 4~8자리)')} value={pin} onChange={(e) => setPin(e.target.value)} />
              <input className="text-input" type="password" inputMode="numeric" placeholder={tr('한 번 더')} value={pin2} onChange={(e) => setPin2(e.target.value)} />
            </div>
            <button
              className="primary-btn"
              disabled={!pinOk}
              onClick={() => {
                void app.lock.lockWith(pin);
                setPin('');
                setPin2('');
              }}
            >
              {tr('PIN 정하고 잠그기')}
            </button>
          </>
        )}
        <Hint>{tr('잠그면 설정을 닫을 때부터 적용돼요 · 게임 조작(키·패드)은 그대로 돼요')}</Hint>
      </Section>

      <Section title="언어 · Language" hint={tr('바꾸면 새로고침돼요 (작업 내용은 저장돼 있어요)')}>
        <Segmented<Lang>
          value={lang}
          onChange={setLang}
          options={[
            ['ko', '한국어'],
            ['en', 'English'],
          ]}
        />
      </Section>

      <Section title={tr('화면')}>
        <Toggle label={tr('전체화면에서 마우스 커서 자동 숨김')} checked={app.hideCursor} onChange={app.setHideCursor} />
        <Toggle
          label={tr('올리는 이미지 자동 최적화 (긴 변 2560px)')}
          checked={optimize}
          onChange={(v) => {
            setOptimize(v);
            setOptimizeEnabled(v);
          }}
        />
      </Section>

      <Section title={tr('앱으로 설치')} hint={tr('설치하면 인터넷이 끊겨도 실행돼요 (행사장 대비)')}>
        {app.install.installed ? (
          <Hint>{tr('이미 앱으로 실행 중이에요')}</Hint>
        ) : app.install.canInstall ? (
          <button className="primary-btn" onClick={() => void app.install.install()}>
            {tr('설치하기')}
          </button>
        ) : (
          <Hint>{tr('브라우저 주소창의 설치 아이콘(또는 메뉴 › 앱 설치)으로 설치할 수 있어요 · 한 번 열어 두면 오프라인에서도 열려요')}</Hint>
        )}
      </Section>

      <Section title={tr('자동 백업')} hint={tr('5분마다 바뀐 게 있으면 이 브라우저에 보관해요 (최근 6개)')}>
        {doc.backups.length === 0 ? (
          <Hint>{tr('아직 백업이 없어요')}</Hint>
        ) : (
          <ul className="backup-list">
            {doc.backups.map((b) => (
              <li key={b.at} className="backup-row">
                <span className="backup-thumb" style={b.thumb ? { backgroundImage: `url(${b.thumb})` } : undefined} />
                <span className="backup-meta">
                  <b>{new Date(b.at).toLocaleString()}</b>
                  <span>
                    {b.name ?? tr('제목 없음')} · {mb(b.blob.size)}
                  </span>
                </span>
                <button
                  className={`chip chip-sm ${confirmRestore === b.at ? 'is-danger' : ''}`}
                  onClick={() => {
                    if (confirmRestore !== b.at) return setConfirmRestore(b.at);
                    setConfirmRestore(null);
                    void doc.restoreBackup(b);
                  }}
                >
                  {confirmRestore === b.at ? tr('확인') : tr('되돌리기')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={tr('저장 공간')}>
        {usage ? (
          <>
            <div className="usage-bar">
              <span style={{ width: `${Math.min(100, (usage.used / usage.quota) * 100)}%` }} />
            </div>
            <Hint>
              {tr('이 브라우저 사용')} {mb(usage.used)} {tr('/ 최대')} {mb(usage.quota)}
            </Hint>
          </>
        ) : (
          <Hint>{tr('이 브라우저는 사용량을 알려주지 않아요')}</Hint>
        )}
      </Section>
    </>
  );
}
