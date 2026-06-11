# Netlify 서버 인증 설정

계정(ID/비밀번호)은 브라우저 `localStorage`가 아니라 **Netlify Functions + Blobs**에 저장됩니다.

## 중요: 드래그 & 드롭 배포는 인증 API가 동작하지 않음

Netlify 사이트에 **`dist` 폴더만** 끌어다 놓으면 HTML/JS만 올라가고, `netlify/functions`의 **로그인·회원가입 API는 배포되지 않습니다.**  
그래서 `/.netlify/functions/auth-signup` 이 **404**가 납니다.

아래 **CLI 배포** 또는 **Git 연동 배포** 중 하나로 바꿔야 합니다.

## CLI로 배포 (드래그 & 드롭 대신, 권장)

프로젝트 폴더(`Book`)에서 PowerShell:

```powershell
npm install
npx netlify login
npx netlify link
```

`netlify link` 실행 시 기존 사이트 **hacbooklist** 를 선택합니다.

환경 변수를 Netlify 대시보드에 먼저 넣은 뒤(아래 표 참고), 배포:

```powershell
npm run deploy
```

또는:

```powershell
npx netlify deploy --prod --build
```

`--build`가 `npm run build`와 **Functions**를 함께 올립니다. 이후부터는 드래그 & 드롭 대신 이 명령만 쓰면 됩니다.

### 배포 확인

배포가 끝나면 Netlify 대시보드 → **Functions** 탭에 `auth-login`, `auth-signup` 이 보여야 합니다.

## 배포 후 Netlify 환경 변수

Site configuration → Environment variables:

| 변수 | 설명 |
|------|------|
| `HAC_USERS_JSON` | 최초 시드용 계정 JSON 배열. 예: `[{"id":"admin","name":"관리자","password":"비밀번호","role":"admin"}]` |
| `HAC_ADMIN_SIGNUP_CODE` | 관리자 회원가입 코드 (미설정 시 관리자 회원가입 비활성화) |

첫 로그인/회원가입 요청 시 Blobs가 비어 있으면 `HAC_USERS_JSON` 계정이 해시되어 저장됩니다. 이후 회원가입은 Blobs에 추가됩니다.

비밀번호는 서버에서 **bcrypt**로 해시되어 저장되며, 클라이언트에는 해시가 내려가지 않습니다.

## 로컬 개발

```bash
npm install
npm run dev
```

`netlify dev`(포트 8888)가 Vite(5173)와 Functions를 함께 띄웁니다. 브라우저는 **http://localhost:8888** 을 사용하세요.

`.env` 파일에 `.env.example` 내용을 복사해 사용하세요.

Vite만 쓰려면 `npm run dev:vite` — 이 경우 Functions 프록시(8888)가 없으면 로그인이 실패합니다.

## API 경로

클라이언트는 `/.netlify/functions/auth-login` 등 **Functions 직접 경로**를 호출합니다. `/api/*` 리다이렉트는 호환용입니다.

## API

- `POST /api/auth-login` — `{ "userId", "password" }`
- `POST /api/auth-signup` — `{ "userId", "password", "name", "role", "adminCode?" }`
- `POST /api/auth-users-admin` — 관리자 전용 (`adminId`, `adminPassword`, `action`)

### 사용자 관리 API (`action`)

| action | 설명 |
|--------|------|
| `list` | 사용자 목록 |
| `create` | `userId`, `password`, `name`, `role` |
| `update` | `targetUserId`, `name`, `role`, `password?` |
| `delete` | `targetUserId` |

앱에서 **관리자 → 사용자 관리** 탭에서 UI로 조작할 수 있습니다.

## 서적 목록 + 독서 상태 (Netlify Blobs)

| 데이터 | Blobs 저장소 | 누가 저장 |
|--------|-------------|-----------|
| **서적 목록** (제목, 권수, 비고, 표지 URL) | `hac-books-catalog` | **관리자**만 |
| **독서 상태** (미독/읽는 중/완독) | `hac-read-status` | 로그인한 **각 사용자** |

- 로그인 사용자: 앱 시작 시 서버에서 **공통 서적 목록** + **본인 독서 상태** 불러옴
- 관리자가 도서 추가/수정/삭제·CSV 복원 시 서버 목록 갱신 → 다른 기기에서도 동일 목록 표시
- `HAC_SESSION_SECRET` 환경 변수 권장 (로그인 토큰 서명)

게스트(비로그인)는 브라우저 로컬 데이터만 사용합니다.

API: `POST /.netlify/functions/books-catalog` — `action: get|save`, `token`, (`catalog` on save)

다른 기기에서 **한 번 로그아웃 후 다시 로그인**하면 최신 데이터가 반영됩니다.

성공 시 `{ "ok": true, "user": { "id", "name", "role" } }`
