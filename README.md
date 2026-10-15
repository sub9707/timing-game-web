# Stopia 스토피아

흘러가는 타이머를 목표 시간에 맞춰 멈추는 웹 게임입니다. 화면 디자인, 문구, 효과음, 판정 규칙, 랭킹을 직접 바꿀 수 있어 행사·수업·방송에서 그대로 쓸 수 있습니다.

- 서비스: https://stopia.site
- 영어: https://stopia.site/en/
- 사용 가이드: https://stopia.site/guide.html

## 주요 기능

- 목표 시간, 허용 오차(퍼센트·직접 입력), 엄격한 판정
- 카운트다운, 결과 후 자동 다음 라운드, 라운드마다 무작위 목표 시간
- 블라인드 모드(일정 시간 뒤 시간 가림)와 극적인 결과 공개
- 테마·글꼴·색·그라데이션·글자 효과, 화면 요소를 끌어서 옮기는 편집기
- 텍스트 상자·그림·도형 삽입, 효과음 교체
- 참가자 이름별 기록, 랭킹 화면, CSV 내보내기
- 송출 창(프로젝터·OBS용), 투명·크로마키 배경
- 키보드·게임패드·터치·마우스 입력, PIN 잠금
- `.stopia` 파일로 저장·불러오기, 자동 백업
- 한국어·영어

회원가입과 서버가 없습니다. 설정과 기록은 모두 브라우저(localStorage·IndexedDB)에 저장됩니다.

## 기술 스택

- React 19, TypeScript
- Vite
- fflate (저장 파일 압축)
- Playwright (e2e 테스트)

## 시작하기

Node.js 20.19 이상 또는 22.12 이상이 필요합니다.

```bash
npm install
npm run dev
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 후 `dist/` 로 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run test:e2e` | e2e 테스트 (설치된 Chrome 사용) |

## 환경변수

`.env.example` 을 `.env` 로 복사해 값을 넣습니다. 모두 선택 사항이며, 비워 두면 해당 기능이 꺼집니다.

| 이름 | 용도 |
| --- | --- |
| `VITE_SITE_URL` | 배포 주소. canonical, hreflang, OG 이미지, `sitemap.xml` 에 씁니다. |
| `VITE_GOOGLE_SITE_VERIFICATION` | Google Search Console 소유 확인 |
| `VITE_NAVER_SITE_VERIFICATION` | 네이버 서치어드바이저 소유 확인 |
| `VITE_BING_SITE_VERIFICATION` | Bing 웹마스터 도구 소유 확인 |
| `VITE_ADSENSE_CLIENT` | 애드센스 게시자 ID. 빌드 때 `ads.txt` 와 소유 확인 메타 태그를 만듭니다. |
| `VITE_ADSENSE_SLOT_LEFT`, `VITE_ADSENSE_SLOT_RIGHT` | 양옆 세로 배너 광고 단위 ID. 둘 다 비어 있으면 광고 영역이 생기지 않습니다. |
| `VITE_GA_ID` | Google Analytics 4 측정 ID. 개발 서버와 송출 창은 집계하지 않습니다. |

## 폴더 구조

```
src/
  App.tsx            메인 화면 (게임·설정·편집 연결)
  OutputApp.tsx      송출 창
  components/
    stage/           무대, 타이머, 결과, 아래 메뉴, 광고 영역
    panel/           설정 패널과 탭
    editor/          화면 편집기
    ui/              공통 UI
  game/              게임 진행, 키, 기록, 효과음
  hooks/             키보드, 파일 끌어다 놓기, 전체화면, 실행 취소 등
  settings/          기본 설정, 테마, 글꼴
  storage/           저장 파일(.stopia), 에셋, 백업
  live/              송출 창 연동 (BroadcastChannel)
  i18n/              한국어 문구를 키로 쓰는 영어 사전
  seo.ts             검색·공유용 문구
  analytics.ts       방문 통계
guide.html, en/      사용 가이드 페이지 (빌드 입력)
public/              아이콘, 개인정보처리방침, 이용약관
e2e/                 Playwright 테스트
```

## 빌드 결과

`npm run build` 는 다음을 만듭니다.

- `index.html` (한국어), `en/index.html` (영어)
- `guide.html`, `en/guide.html`
- `robots.txt`, `sitemap.xml` (`VITE_SITE_URL` 이 있을 때)
- `ads.txt` (`VITE_ADSENSE_CLIENT` 가 있을 때)

## 배포

Netlify 에 연결해 배포합니다. 빌드 명령은 `npm run build`, 배포 폴더는 `dist` 입니다. 환경변수는 Netlify 사이트 설정에 넣습니다. `public/_redirects` 는 기본 주소(`stopia.netlify.app`)를 `stopia.site` 로 보냅니다.

## 문의

stopia_help@proton.me
