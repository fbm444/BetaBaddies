# k6 Test User Setup

## Pre-creating Test Users

Before running k6 load tests, you need to pre-create test users in the database. This ensures tests can authenticate without needing to register users during test execution.

## Quick Setup

Run the setup script to create all test users:

```bash
cd backend
node tests/k6/setup-test-users.js
```

Or from the project root:

```bash
node backend/tests/k6/setup-test-users.js
```

## Test Users Created

The script creates the following test users:

- `test@example.com` / `TestPassword123`
- `test1@example.com` / `TestPassword123`
- `test2@example.com` / `TestPassword123`
- `test3@example.com` / `TestPassword123`
- `test4@example.com` / `TestPassword123`
- `test5@example.com` / `TestPassword123`

All users have:
- Password: `TestPassword123` (meets validation requirements)
- First Name: "Test"
- Last Name: "User" / "User1" / etc.
- Account Type: "regular"
- Auth Provider: "local"

## Automatic Setup

The `run-all-tests.sh` script automatically runs the setup script before executing tests, so you don't need to run it manually if using the test runner.

## Manual Setup

If you prefer to create users manually or need custom users:

1. Set the `DATABASE_URL` environment variable (or use `.env` file)
2. Run the setup script
3. Verify users were created successfully

## Environment Variables

The setup script uses these environment variables:

- `DATABASE_URL` - PostgreSQL connection string (defaults to localhost)
- `POSTGRES_URL` - Alternative name for database URL

## Troubleshooting

### Users Already Exist

If users already exist, the script will:
- Skip creating them
- Update their passwords to ensure consistency
- Continue with the next user

### Database Connection Errors

Make sure:
- Database is running
- `DATABASE_URL` is set correctly
- Database credentials are valid
- Network connectivity to database server

### Password Validation

All test passwords meet the validation requirements:
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- Minimum length requirements

