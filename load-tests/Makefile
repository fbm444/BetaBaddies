# Makefile for Load Testing
# Usage: make test-api, make test-all, etc.

.PHONY: help install test-api test-database test-files test-full test-all create-user clean

help:
	@echo "Load Testing Commands:"
	@echo "  make install          - Install k6 (if not installed)"
	@echo "  make create-user      - Create test user in database"
	@echo "  make test-api         - Run API endpoints test"
	@echo "  make test-database    - Run database performance test"
	@echo "  make test-files        - Run file upload/download test"
	@echo "  make test-full        - Run full load test"
	@echo "  make test-all         - Run all tests"
	@echo "  make clean            - Clean test results"

install:
	@echo "Installing k6..."
	@if command -v brew >/dev/null 2>&1; then \
		brew install k6; \
	elif command -v apt-get >/dev/null 2>&1; then \
		sudo apt-get update && sudo apt-get install -y k6; \
	else \
		echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"; \
	fi

create-user:
	@echo "Creating test user..."
	@cd ../backend && node -e " \
		const bcrypt = require('bcrypt'); \
		const { Pool } = require('pg'); \
		const dbConfig = require('./config/db.config.js').default; \
		const pool = new Pool(dbConfig); \
		(async () => { \
			try { \
				const email = process.env.TEST_USER_EMAIL || 'loadtest@example.com'; \
				const password = process.env.TEST_USER_PASSWORD || 'LoadTest123!'; \
				const existing = await pool.query('SELECT u_id FROM users WHERE email = \$1', [email]); \
				if (existing.rows.length > 0) { \
					console.log('Test user already exists'); \
					process.exit(0); \
				} \
				const hashed = await bcrypt.hash(password, 10); \
				const result = await pool.query( \
					'INSERT INTO users (u_id, email, password, account_type) VALUES (gen_random_uuid(), \$1, \$2, \$3) RETURNING u_id', \
					[email, hashed, 'regular'] \
				); \
				console.log('Test user created:', result.rows[0].u_id); \
			} catch (error) { \
				console.error('Error:', error.message); \
				process.exit(1); \
			} finally { \
				await pool.end(); \
			} \
		})(); \
	"

test-api:
	@echo "Running API endpoints test..."
	@k6 run api-endpoints.test.js

test-database:
	@echo "Running database performance test..."
	@k6 run database-performance.test.js

test-files:
	@echo "Running file upload/download test..."
	@k6 run file-upload-download.test.js

test-full:
	@echo "Running full load test..."
	@k6 run full-load.test.js

test-all:
	@echo "Running all load tests..."
	@./run-load-tests.sh

clean:
	@echo "Cleaning test results..."
	@rm -rf load-test-results/*
	@echo "Test results cleaned"

