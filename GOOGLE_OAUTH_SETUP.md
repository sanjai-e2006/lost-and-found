# Google OAuth Setup Guide

## ✅ Changes Made to Fix Authentication Issues

1. **Fixed all redirect URLs** - Changed from `/dashboard.html` to `/dashboard`
2. **Updated paths in:**
   - `login.js` - redirects to `/dashboard`
   - `signup.js` - redirects to `/dashboard`
   - `home.js` - redirects to `/dashboard`
   - `supabase-client.js` - Google OAuth redirects to `/dashboard`
3. **Created clear-session page** - Visit `/clear-session` to logout from default account

## 🔧 To Enable Google Sign-In

### Step 1: Configure Google OAuth in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project (`wrhlkisiglmhncwqykac`)
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and click to enable it
5. You'll need to create a Google OAuth App:

### Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen first if prompted
6. Application type: **Web application**
7. Add Authorized redirect URIs:
   ```
   https://wrhlkisiglmhncwqykac.supabase.co/auth/v1/callback
   ```
8. Copy the **Client ID** and **Client Secret**

### Step 3: Add Credentials to Supabase

1. Back in Supabase → Authentication → Providers → Google
2. Paste your **Client ID**
3. Paste your **Client Secret**
4. Save the settings

### Step 4: Test Google Sign-In

1. First, clear your session: Visit `http://localhost:3000/clear-session`
2. Click "Clear Session & Logout"
3. Go to home page: `http://localhost:3000/`
4. Click "Get Started" → should go to `/signup`
5. Click "Continue with Google"
6. Should redirect to Google login → then back to `/dashboard`

## 🚀 Quick Test Steps

### To Clear Default Account (sanjai020206@gmail.com):

**Option 1: Use Clear Session Page**
```
http://localhost:3000/clear-session
```

**Option 2: Browser Console**
```javascript
localStorage.clear();
location.reload();
```

**Option 3: Logout from Dashboard**
- Go to dashboard
- Click the Logout button in the sidebar

### Test Fresh User Flow:

1. Clear session (use any option above)
2. Visit home: `http://localhost:3000/`
3. Click "Get Started"
4. Should redirect to `/signup`
5. Create new account or use Google Sign-In
6. Should redirect to `/dashboard`

## 📝 Current User Flow

```
Home Page → Get Started Button
    ↓
    ├─→ If NOT logged in → /signup page
    │       ↓
    │       ├─→ Sign up with email → /dashboard
    │       └─→ Continue with Google → /dashboard
    │
    └─→ If ALREADY logged in → /dashboard
```

## ⚠️ Important Notes

- No more default/test account auto-login
- All paths now use `/dashboard` instead of `/dashboard.html`
- Google OAuth will only work after configuring in Supabase
- Session is stored in localStorage by Supabase
- Clear session clears both auth and localStorage

## 🔍 Troubleshooting

### Google Sign-In Not Working?
1. Check Supabase → Authentication → Providers → Google is enabled
2. Verify Client ID and Secret are correct
3. Check redirect URI matches exactly
4. Clear browser cache and try again

### Still Going to Default Account?
1. Visit: `http://localhost:3000/clear-session`
2. Or run in console: `localStorage.clear()`
3. Refresh the page

### "Cannot GET /public/dashboard.html" Error?
- This is fixed! All paths now use `/dashboard` (without .html)
- Restart your server if still seeing this error
