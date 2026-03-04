-- ECLUB PMO INTERNAL ISSUE MANAGEMENT SYSTEM INITIAL SCHEMA
-- Location: Supabase SQL Editor

-- 1. 사용자 테이블 (issue_users) 생성 - PMO 전용으로 역할 수정
CREATE TABLE IF NOT EXISTS issue_users (
    user_id              BIGINT PRIMARY KEY,
    email                VARCHAR(100) UNIQUE NOT NULL,
    password             VARCHAR(255) NOT NULL,
    name                 VARCHAR(50) NOT NULL,
    department           VARCHAR(50),
    role                 VARCHAR(20) NOT NULL, -- PMO 리더, PMO 멤버, 관리자
    status               VARCHAR(10) DEFAULT '사용',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 이슈 테이블 (issues) 생성 - PMO 내부 관리 필드로 최적화
CREATE TABLE IF NOT EXISTS issues (
    issue_id        BIGINT PRIMARY KEY,
    display_id      VARCHAR(20),
    seq             NUMERIC(5, 2),
    category        VARCHAR(50) DEFAULT '이슈',
    issue_type      VARCHAR(50),
    title           VARCHAR(250) NOT NULL,
    description     TEXT, -- 내부 기밀 내용 포함
    severity        VARCHAR(20), -- Critical, High, Medium, Low
    priority        VARCHAR(10), -- P1, P2, P3
    status          VARCHAR(20) DEFAULT '발생', -- 발생, 분석중, 조치중, 종결
    occurrence_date DATE,
    target_date     DATE,
    pmo_assignee    VARCHAR(50), -- PMO 내부 담당자
    related_dept    VARCHAR(50), -- 유관 부서
    action_plan     TEXT, -- 내부 대응 계획
    action_result   TEXT, -- 조치 결과
    is_escalated    BOOLEAN DEFAULT FALSE, -- 경영진 보고 여부
    report_line     VARCHAR(100), -- 내부 보고 대상
    remarks         TEXT, -- 내부 메모
    creator         VARCHAR(50),
    is_deleted      CHAR(1) DEFAULT 'N',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
