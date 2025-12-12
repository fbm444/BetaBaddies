-- API Monitoring System Tables
-- Tracks API usage, errors, quotas, and response times

-- API Services Configuration
CREATE TABLE IF NOT EXISTS api_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'openai', 'abstract_api', 'newsapi', 'bls'
    display_name VARCHAR(200) NOT NULL,
    base_url TEXT,
    rate_limit_per_day INTEGER DEFAULT 0, -- 0 means unlimited or not tracked
    rate_limit_per_hour INTEGER DEFAULT 0,
    rate_limit_per_minute INTEGER DEFAULT 0,
    quota_limit_per_month INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- API Usage Statistics
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    endpoint VARCHAR(500), -- API endpoint or method name
    user_id UUID REFERENCES users(u_id) ON DELETE SET NULL, -- NULL for system calls
    request_method VARCHAR(10), -- GET, POST, etc.
    response_status INTEGER, -- HTTP status code
    response_time_ms INTEGER, -- Response time in milliseconds
    tokens_used INTEGER, -- For OpenAI, tokens consumed
    cost_usd DECIMAL(10, 6) DEFAULT 0, -- Cost in USD if applicable
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Error Logs
CREATE TABLE IF NOT EXISTS api_error_logs (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    endpoint VARCHAR(500),
    user_id UUID REFERENCES users(u_id) ON DELETE SET NULL,
    error_code VARCHAR(50), -- e.g., 'RATE_LIMIT', 'AUTH_ERROR', 'TIMEOUT'
    error_message TEXT,
    error_details JSONB, -- Additional error context
    request_payload JSONB, -- Request data (sanitized)
    response_status INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Quota Tracking
CREATE TABLE IF NOT EXISTS api_quotas (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'hourly', 'monthly'
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    requests_count INTEGER DEFAULT 0,
    requests_limit INTEGER DEFAULT 0, -- 0 means unlimited
    tokens_used INTEGER DEFAULT 0,
    tokens_limit INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    cost_limit_usd DECIMAL(10, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_id, period_type, period_start)
);

-- API Response Time Metrics (for performance monitoring)
CREATE TABLE IF NOT EXISTS api_response_times (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    endpoint VARCHAR(500),
    response_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Alerts (for rate limit warnings)
CREATE TABLE IF NOT EXISTS api_alerts (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'rate_limit_warning', 'quota_exceeded', 'error_spike'
    severity VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    threshold_value DECIMAL(10, 2), -- e.g., 80% of quota
    current_value DECIMAL(10, 2),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly API Usage Reports
CREATE TABLE IF NOT EXISTS api_usage_reports (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    report_week_start DATE NOT NULL,
    report_week_end DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10, 6) DEFAULT 0,
    avg_response_time_ms DECIMAL(10, 2),
    p95_response_time_ms DECIMAL(10, 2),
    p99_response_time_ms DECIMAL(10, 2),
    error_count INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    report_data JSONB, -- Additional metrics and breakdowns
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_id, report_week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service_id ON api_usage_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_success ON api_usage_logs(success);

CREATE INDEX IF NOT EXISTS idx_api_error_logs_service_id ON api_error_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_created_at ON api_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_error_code ON api_error_logs(error_code);

CREATE INDEX IF NOT EXISTS idx_api_quotas_service_id ON api_quotas(service_id);
CREATE INDEX IF NOT EXISTS idx_api_quotas_period ON api_quotas(period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_api_response_times_service_id ON api_response_times(service_id);
CREATE INDEX IF NOT EXISTS idx_api_response_times_created_at ON api_response_times(created_at);

CREATE INDEX IF NOT EXISTS idx_api_alerts_service_id ON api_alerts(service_id);
CREATE INDEX IF NOT EXISTS idx_api_alerts_resolved ON api_alerts(is_resolved, created_at);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_api_services_timestamp ON api_services;
CREATE TRIGGER update_api_services_timestamp
    BEFORE UPDATE ON api_services
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS update_api_quotas_timestamp ON api_quotas;
CREATE TRIGGER update_api_quotas_timestamp
    BEFORE UPDATE ON api_quotas
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- Insert default API services
INSERT INTO api_services (service_name, display_name, base_url, rate_limit_per_day, rate_limit_per_hour, rate_limit_per_minute, quota_limit_per_month) VALUES
    ('openai', 'OpenAI API', 'https://api.openai.com/v1', 0, 0, 0, 0), -- Tracked via usage-based pricing
    ('abstract_api', 'Abstract API', 'https://companyenrichment.abstractapi.com/v1', 0, 0, 0, 20), -- Free tier: 20 requests/month
    ('newsapi', 'NewsAPI', 'https://newsapi.org/v2', 100, 0, 0, 0), -- Free tier: 100 requests/day
    ('bls', 'BLS API', 'https://api.bls.gov/publicAPI/v2', 500, 0, 0, 0), -- With API key: 500 requests/day
    ('gmail', 'Gmail API', 'https://gmail.googleapis.com/gmail/v1', 500, 0, 0, 0); -- Gmail API: Very high limits, track usage

