CREATE TABLE IF NOT EXISTS companies (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    uen          VARCHAR(64),
    gst_registered BOOLEAN NOT NULL DEFAULT FALSE,
    gst_reg_number VARCHAR(64),
    financial_year_start_month TINYINT NOT NULL DEFAULT 1,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'SGD',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id   BIGINT NOT NULL,
    code         VARCHAR(32) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(32) NOT NULL,
    parent_account_id BIGINT NULL,
    gst_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE UNIQUE INDEX ux_accounts_company_code ON accounts(company_id, code);
