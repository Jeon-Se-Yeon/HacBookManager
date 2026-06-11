# HAC Book Manager

HAC 서적 목록을 관리하고 구성원별 독서 상태를 기록하는 웹 애플리케이션입니다.

**Live**: https://hacbooklist.netlify.app

## 주요 기능

- **서적 목록** — 카테고리·권수·비고·표지 이미지와 함께 서적을 관리 (관리자만 편집 가능)
- **독서 상태** — 사용자별로 미독 / 읽는 중 / 완독 상태를 기록, 어느 기기에서나 동기화
- **대시보드** — 카테고리별 보유 현황과 독서 진행률 시각화
- **위시리스트** — 읽고 싶은 책 따로 관리
- **계정 시스템** — 회원가입 / 로그인, 관리자 권한 분리, 관리자용 사용자 관리 UI
- **CSV 가져오기 / 내보내기** — 서적 목록 백업 및 복원
- **테마 설정** — 다크 모드 등 테마 변경

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프런트엔드 | React 18, Vite |
| 백엔드 | Netlify Functions (서버리스) |
| 데이터베이스 | [Turso](https://turso.tech) (libSQL, SQLite 호환) — 로컬 개발 시 SQLite 파일 |
| 인증 | bcrypt 비밀번호 해시 + HMAC 서명 세션 토큰 |
| 배포 | Netlify (GitHub 연동 자동 배포) |

## 프로젝트 구조

```
├── src/                    # React 프런트엔드
│   ├── components/         # UI 컴포넌트 (BookList, Dashboard, Wishlist 등)
│   ├── context/            # 테마 컨텍스트
│   └── utils/              # API 클라이언트, 훅
├── netlify/
│   ├── functions/          # API 엔드포인트 (서버리스 함수)
│   │   ├── auth-login.js
│   │   ├── auth-signup.js
│   │   ├── auth-users-admin.js
│   │   ├── books-catalog.js
│   │   └── read-status.js
│   └── lib/                # 공유 서버 로직
│       ├── db.js           # DB 클라이언트 + 스키마 초기화
│       ├── users.js        # 사용자 관리
│       ├── catalog.js      # 서적 목록
│       ├── readStatus.js   # 독서 상태
│       └── session.js      # 세션 토큰
└── netlify.toml            # 빌드 / 함수 / 리다이렉트 설정
```

## 데이터베이스

`netlify/lib/db.js`가 첫 요청 시 스키마를 자동 생성합니다.

| 테이블 | 설명 |
|--------|------|
| `users` | 계정 (id, name, password_hash, role, created_at) |
| `books` | 서적 목록 (id, title, category, volumes, notes, cover_image_url, sort_order) |
| `read_status` | 사용자별 독서 상태 (user_id, book_id, status) |

- **배포 환경**: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`으로 Turso에 연결 (네이티브 바이너리가 없는 `@libsql/client/web` 사용)
- **로컬 개발**: 환경 변수가 없으면 자동으로 `.data/hac-book.db` SQLite 파일 생성

## 로컬 개발

```bash
npm install
cp .env.example .env   # 값 채우기 (Turso 변수는 비워두면 로컬 SQLite 사용)
npm run dev            # netlify dev — http://localhost:8888
```

> Vite만 띄우는 `npm run dev:vite`도 있지만, 이 경우 Functions 프록시가 없어 로그인 등 API가 동작하지 않습니다.

## 배포

`main` 브랜치에 push하면 Netlify가 자동으로 빌드·배포합니다.

### 환경 변수 (Netlify Site settings > Environment variables)

| 변수 | 설명 |
|------|------|
| `TURSO_DATABASE_URL` | Turso DB URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 |
| `HAC_USERS_JSON` | 초기 시드 계정 JSON 배열 (users 테이블이 비어 있을 때 1회 적용) |
| `HAC_ADMIN_SIGNUP_CODE` | 관리자 회원가입 코드 (미설정 시 관리자 가입 비활성화) |
| `HAC_SESSION_SECRET` | 세션 토큰 서명용 랜덤 문자열 |

자세한 값 형식은 [.env.example](./.env.example)을 참고하세요.

## API

모든 엔드포인트는 `POST` 방식이며 `/api/*` 경로로 호출합니다.

| 엔드포인트 | 설명 |
|-----------|------|
| `/api/auth-login` | 로그인 — `{ userId, password }` |
| `/api/auth-signup` | 회원가입 — `{ userId, password, name, role, adminCode? }` |
| `/api/auth-users-admin` | 사용자 관리 (관리자 전용) — `action: list \| create \| update \| delete` |
| `/api/books-catalog` | 서적 목록 — `action: get \| save` (save는 관리자 전용) |
| `/api/read-status` | 독서 상태 — `action: get \| save \| patch` |
