# 🛡️ ECLUB PMO 이슈 관리 시스템 (IMS)
**Enterprise Issue Management System for PMO Leaders**

이 프로젝트는 ECLUB 프로젝트의 리스크를 실시간으로 모니터링하고, PMO 내부의 의사결정을 지원하기 위해 구축된 전용 웹 애플리케이션입니다.

---

## 🚀 주요 기능 (Key Features)

- **지능형 대시보드**: 이슈 유형별 분포 및 심각도 현황 실시간 시각화 (Chart.js 연동).
- **리스크 관리 UI**: 발생, 분석, 조치, 종결로 이어지는 PMO 전용 워크플로우 관리.
- **내부 보안 인증**: PMO 멤버 전용 세션 인증 시스템 및 역할 기반 권한 제어.
- **실시간 데이터 연동**: Supabase(PostgreSQL) 기반의 안정적인 데이터 보존 및 실시간 동기화.
- **마이그레이션 기여**: 기존 엑셀 기반 이슈 19건을 완벽하게 시스템화 완료.

---

## 📂 프로젝트 구조 (Project Structure)

- `index.html`: 메인 웹 애플리케이션 인터페이스.
- `css/style.css`: PMO 전용 프리미엄 프리미엄 테마 및 디자인 시스템.
- `js/app.js`: SPA(Single Page Application) 코어 로직 및 내비게이션.
- `js/storage.js`: Supabase 연동 데이터 서비스 레이어.
- `js/config.js`: API 접속 정보 및 인프라 설정. (기밀 유지 필요)
- `ISSUE_MANAGE_STRATEGY.md`: 프로젝트 수행 전략 및 히스토리 관리 문서.
- `db_schema.md`: 데이터베이스 테이블 설계 명세서.

---

## 🔑 접속 정보 (Quick Start)

- **테스트용 계정**: 
    - ID: `pmo@eclub.com`
    - PW: `pmo1234`
- **배포 주소**: [https://mohenz.github.io/pmo_management/](https://mohenz.github.io/pmo_management/)  
  *(GitHub Actions 배포 완료 후 활성화됩니다)*

---

## 🛠 유지보수 가이드 (Maintenance)

- **새로운 필드 추가**: `db_schema.md`에 정의 후 `Supabase SQL Editor`에서 `ALTER TABLE` 명령을 수행하세요.
- **이미지 업로드**: `storage.js` 내에 스토리지 연동 함수를 추가하여 이슈별 증적 이미지 관리가 가능합니다.

---

*"Brian, ECLUB의 심장이 되어줄 이슈 관리 시스템이 준비되었습니다. 모든 리스크를 한눈에 통제하세요."*
