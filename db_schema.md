# 🗄️ ECLUB 이슈 관리 시스템 데이터베이스 설계서 (Supabase/PostgreSQL)

이 문서는 `issue_manage` 시스템의 데이터 영속성을 위한 Supabase(PostgreSQL) 테이블 설계 명세입니다. 기존 엑셀 데이터를 기반으로 확장성 있게 설계되었습니다.

---

## 1. 사용자 테이블 (issue_users)

시스템 접근 권한 및 인증 정보를 관리합니다.

```sql
CREATE TABLE issue_users (
    user_id              BIGINT PRIMARY KEY,          -- 관리번호 (Unique Timestamp)
    email                VARCHAR(100) UNIQUE NOT NULL, -- 이메일 (로그인 ID)
    password             VARCHAR(255) NOT NULL,       -- 암호화된 비밀번호 (BCrypt)
    name                 VARCHAR(50) NOT NULL,        -- 성함
    department           VARCHAR(50),                 -- 소속 부서
    role                 VARCHAR(20) NOT NULL,        -- 역할 (PMO 리더, PMO 멤버, 관리자)
    status               VARCHAR(10) DEFAULT '사용',   -- 계정 상태 (사용, 사용중지)
    created_at           TIMESTAMPTZ DEFAULT NOW(),   -- 등록일
    updated_at           TIMESTAMPTZ DEFAULT NOW()    -- 수정일
);
```

## 2. 이슈 테이블 (issues)

ECLUB 프로젝트에서 발생하는 이슈를 관리합니다. 엑셀 연동을 고려하여 필드를 구성했습니다.

```sql
CREATE TABLE issues (
    issue_id        BIGINT PRIMARY KEY,          -- 이슈 고유 ID (Unique Timestamp)
    display_id      VARCHAR(20),                 -- 표시용 ID (예: ISU-01, ISU-02)
    seq             NUMERIC(5, 2),               -- 순번 (엑셀 SEQ 반영, 예: 1.0, 3.0)
    category        VARCHAR(50) DEFAULT '이슈',    -- 구분 (이슈, 리스크 등)
    issue_type      VARCHAR(50),                 -- 유형 (범위, 기획, 자원, 일정 등)
    title           VARCHAR(250) NOT NULL,       -- 이슈 제목
    description     TEXT,                        -- 상세 내용 (기밀 포함 가능)
    severity        VARCHAR(20),                 -- 심각도 (Critical, High, Medium, Low)
    priority        VARCHAR(10),                 -- 우선순위 (P1, P2, P3)
    status          VARCHAR(20) DEFAULT '발생',    -- 상태 (발생, 분석중, 조치중, 종결)
    occurrence_date DATE,                        -- 발생일
    target_date     DATE,                        -- 해결기한
    pmo_assignee    VARCHAR(50),                 -- PMO 담당 조치자
    related_dept    VARCHAR(50),                 -- 관련 부서 (유관 부서)
    action_plan     TEXT,                        -- 내부 대응 전략 및 조치 계획
    action_result   TEXT,                        -- 조치 결과
    is_escalated    BOOLEAN DEFAULT FALSE,       -- 경영진 보고(에스컬레이션) 여부
    report_line     VARCHAR(100),                -- 보고라인 (내부 보고 대상)
    remarks         TEXT,                        -- 비고 (내부 메모)
    creator         VARCHAR(50),                 -- 등록자 (시스템 사용자명)
    is_deleted      CHAR(1) DEFAULT 'N',         -- 삭제 여부 (Y/N)
    created_at      TIMESTAMPTZ DEFAULT NOW(),   -- 등록일시
    updated_at      TIMESTAMPTZ DEFAULT NOW()    -- 최종수정일시
);
```

---

## 3. 설계 상세 및 제약 조건

1.  **ID 체계**: 
    *   `issue_id`: 시스템 내부 조인 및 영속성 관리를 위해 `BIGINT` (Timestamp) 사용.
    *   `display_id`: 엑셀과의 매칭 및 사용자 가독성을 위해 `ISU-XX` 형식을 별도로 저장.
2.  **데이터 타입 최적화**: 
    *   `seq`: 엑셀의 `1.0`, `1.1` 같은 소수점 순번을 지원하기 위해 `NUMERIC` 사용.
    *   `is_escalated`: 엑셀의 `○` 표시를 시스템에서는 `Boolean` 타입으로 관리.
3.  **날짜 관리**: 모든 생성/수정 일시는 `TIMESTAMPTZ`를 사용하여 글로벌 시간대 호환성을 확보합니다.
4.  **역할 구분**: `issue_users.role` 필드를 통해 고객사 담당자와 프로젝트팀의 수정 권한을 차등 부여할 예정입니다.

---

*"Phase 1의 핵심 산출물인 DB 설계가 완료되었습니다. 이 설계를 바탕으로 다음 단계인 환경 구축 및 데이터 서비스 개발(Phase 2)을 시작할 수 있습니다."*
