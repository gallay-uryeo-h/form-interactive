# form-interactive

Google Stitch 프로젝트(`https://stitch.google.com/u/9/projects/10859120725644269802`)의 디자인 및 인터랙션을 추출하여 **Firebase Cloud Firestore**와 실시간 양방향 연동한 웹 애플리케이션입니다.

## 📌 주요 특징

1. **Stitch 원본 디자인 100% 충실 반영**
   - **Admin 시트 관리 (웹)**: 고밀도 스프레드시트 뷰, 수식입력줄(`fx`), 인라인 셀 편집
   - **User 내 데이터 편집 (모바일)**: 사용자별 카드 뷰, 실시간 입력 폼(상태, 마감일, 우선순위, 승인, 진척도)
   - **데이터 시각화 대시보드 (웹)**: Firestore 실시간 집계 KPI 통계, 도넛 차트, 부서별 진척도 바 차트, 랭킹 브레이크다운
   - **시트 목록 홈 (웹)**: 템플릿 갤러리 및 최근 스프레드시트 목록

2. **단일 Firestore 컬렉션 구조 (`form-interactive`)**
   - 다른 앱들과 공유하는 Firebase 프로젝트 환경에 맞춰 **단일 컬렉션(`form-interactive`)** 하에 모든 문서를 격리 보관합니다.
   - 컬렉션이 비어 있는 경우 Stitch 기본 샘플 태스크들이 자동으로 시딩(seed)됩니다.
   - 한 화면(예: 모바일)에서 진척도 슬라이더나 상태 드롭다운을 조작하면, 다른 화면(Admin 시트, 대시보드)에 초 단위 실시간(`onSnapshot`)으로 반영됩니다.

3. **통합 허브 & 분할 뷰 (`index.html`)**
   - 상단 탭을 통해 모든 화면을 편리하게 전환할 수 있습니다.
   - **실시간 분할 뷰(Split View)** 모드를 제공하여 좌측(Admin 웹 시트)과 우측(User 모바일 뷰)을 동시에 띄워두고 실시간 양방향 동기화를 즉시 시각적으로 확인할 수 있습니다.

---

## 🛠 Firebase 연동 설정

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAodFwVZvSAlMxppnODM4VVR5fSjfkhvi4",
  authDomain: "studio-2726051254-c02c9.firebaseapp.com",
  projectId: "studio-2726051254-c02c9",
  storageBucket: "studio-2726051254-c02c9.firebasestorage.app",
  messagingSenderId: "58367223801",
  appId: "1:58367223801:web:817b230c96124a828dff28"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "form-interactive";
```

---

## 🚀 실행 방법

### 방법 1. 정적 파일 직접 열기
- 브라우저에서 `index.html`을 바로 열거나 로컬 웹서버를 이용합니다.

### 방법 2. 로컬 웹 서버 실행 (권장)
```bash
npm start
# 또는
npx serve . -p 3000
```
브라우저에서 `http://localhost:3000` 접속

---

## 📂 파일 구조

- `index.html`: 통합 네비게이션 허브 및 실시간 분할 뷰 (메인 진입점)
- `admin.html`: Admin 시트 관리 화면 (스프레드시트 뷰)
- `mobile.html`: User 내 데이터 편집 화면 (모바일 폼 뷰)
- `dashboard.html`: 데이터 시각화 대시보드 화면
- `home.html`: 시트 목록 홈 화면
- `firebase-service.js`: Firebase Firestore 연결, 실시간 구독 및 CRUD 로직 모듈
- `package.json`: 프로젝트 설정 및 실행 스크립트
- `stitch-raw/`: Stitch MCP 도구(`download_file`)로 내려받은 원본 HTML 파일 보관소

