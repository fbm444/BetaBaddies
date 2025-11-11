# Google Calendar Integration Setup Guide

## Overview
This guide will help you set up Google Calendar integration for the Interview Scheduling feature.

## Prerequisites
- Google Cloud Platform account
- Access to Google Cloud Console
- OAuth 2.0 credentials

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace account)
   - Fill in the required information:
     - App name: `ATS Tracker`
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Save and continue

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `ATS Tracker Calendar Integration`
   - **Authorized JavaScript origins**:
     - `http://localhost:3001` (for development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/api/v1/calendar/auth/callback` (for development)
     - `https://your-production-domain.com/api/v1/calendar/auth/callback` (for production)
   - Click **Create**

7. Copy the **Client ID** and **Client Secret**

## Step 2: Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click **Enable**

## Step 3: Configure Environment Variables

Add the following to your `.env` file in the `backend` directory:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Google Calendar Callback URL (must match exactly what's in Google Cloud Console)
GOOGLE_CALENDAR_CALLBACK_URL=http://localhost:3001/api/v1/calendar/auth/callback

# Backend URL (used if GOOGLE_CALENDAR_CALLBACK_URL is not set)
BACKEND_URL=http://localhost:3001
# or
SERVER_URL=http://localhost:3001

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:3000
```

## Step 4: Verify Redirect URI Configuration

**IMPORTANT**: The redirect URI in your `.env` file must **exactly match** one of the authorized redirect URIs in Google Cloud Console.

### For Development:
```
http://localhost:3001/api/v1/calendar/auth/callback
```

### For Production:
```
https://your-production-domain.com/api/v1/calendar/auth/callback
```

**Common Issues:**
- ❌ `http://localhost:3001/api/v1/calendar/auth/callback/` (trailing slash)
- ❌ `http://localhost:3001/api/v1/calendar/auth/callback?param=value` (query params)
- ✅ `http://localhost:3001/api/v1/calendar/auth/callback` (correct)

## Step 5: Test the Integration

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Navigate to the Interview Scheduling page in your frontend

3. Click **Connect Google Calendar**

4. You should be redirected to Google's OAuth consent screen

5. After authorizing, you should be redirected back to the Interview Scheduling page with a success message

## Troubleshooting

### Error: `redirect_uri_mismatch`

**Cause**: The redirect URI in the OAuth request doesn't match any authorized redirect URIs in Google Cloud Console.

**Solution**:
1. Check the redirect URI in your `.env` file
2. Verify it matches exactly (including protocol, domain, port, and path) in Google Cloud Console
3. Make sure there are no trailing slashes or extra characters
4. Wait a few minutes after updating Google Cloud Console (changes may take time to propagate)

### Error: `invalid_client`

**Cause**: Invalid Client ID or Client Secret.

**Solution**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env` file
2. Make sure there are no extra spaces or quotes
3. Regenerate credentials in Google Cloud Console if needed

### Error: `access_denied`

**Cause**: User denied permission or OAuth consent screen not configured.

**Solution**:
1. Make sure the OAuth consent screen is properly configured
2. Add required scopes to the consent screen
3. If testing with a non-Google Workspace account, make sure the app is in "Testing" mode and add test users

## Production Setup

For production, make sure to:

1. Update authorized redirect URIs in Google Cloud Console to your production domain
2. Update `GOOGLE_CALENDAR_CALLBACK_URL` in your production `.env` file
3. Set `FRONTEND_URL` to your production frontend URL
4. Set `BACKEND_URL` or `SERVER_URL` to your production backend URL
5. Publish your OAuth consent screen (if using External app type)

## Security Notes

- Never commit `.env` files to version control
- Use environment variables in production
- Regularly rotate OAuth credentials
- Monitor OAuth usage in Google Cloud Console
- Use HTTPS in production

