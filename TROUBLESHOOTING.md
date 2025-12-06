# 🔧 Troubleshooting Guide

## � Google OAuth Not Working on Vercel

### Problem: Google Sign-In works on localhost but fails on Vercel
**Error**: "localhost refused to connect" or "An error occurred"

**Cause**: Google OAuth and Supabase are not configured for your Vercel domain.

### ✅ **Fix Steps:**

#### **Step 1: Configure Supabase URLs**
1. Go to https://app.supabase.com
2. Select your project
3. Click **Authentication** → **URL Configuration**
4. **Site URL**: `https://lost-and-found-pr4m.vercel.app`
5. **Add Redirect URLs**:
   ```
   https://lost-and-found-pr4m.vercel.app/**
   https://lost-and-found-pr4m.vercel.app/dashboard.html
   http://localhost:3000/**
   ```
6. Click **Save**

#### **Step 2: Configure Google Cloud Console**
1. Go to https://console.cloud.google.com
2. **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. **Add Authorized JavaScript origins**:
   ```
   https://lost-and-found-pr4m.vercel.app
   http://localhost:3000
   ```
5. **Add Authorized redirect URIs**:
   ```
   https://wrhlkisiglmhncwqykac.supabase.co/auth/v1/callback
   ```
6. Click **Save**

#### **Step 3: Enable Google in Supabase**
1. In Supabase: **Authentication** → **Providers**
2. Enable **Google**
3. Add **Client ID** and **Client Secret** from Google Console
4. Click **Save**

#### **Step 4: Test**
1. Clear browser cache
2. Go to: https://lost-and-found-pr4m.vercel.app/login.html
3. Click "Continue with Google" ✅

---

## �📱 Mobile Access Issues

### Problem: "Unable to open webpage" or "localhost refused to connect"

**Cause**: Your mobile phone cannot access `localhost` because the server is running on your PC.

### ✅ Solutions:

#### **Option 1: Use Vercel (Production) - RECOMMENDED**
Access your deployed app instead:
```
https://lost-and-found-pr4m.vercel.app
```

✅ Works on any device  
✅ No setup needed  
✅ Always accessible  

---

#### **Option 2: Access from PC's IP (Local Testing)**

**Step 1: Get your PC's IP address**

On Windows PowerShell:
```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Step 2: Update server.js to allow external connections**

Add this to your `server.js`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://YOUR_IP:${PORT}`);
});
```

**Step 3: Start server**
```bash
node server.js
```

**Step 4: Access from mobile**
```
http://192.168.1.100:3000
```
(Replace with your actual IP)

**⚠️ Important:**
- Mobile and PC must be on the **same WiFi network**
- Check firewall settings if it doesn't work

---

## 🔑 Google OAuth Not Working

### Problem: Google sign-in button doesn't work or gives error

**Cause**: Google OAuth is not configured in Supabase

### ✅ Solution:

#### **Step 1: Enable Google OAuth in Supabase**

1. Go to: https://app.supabase.com
2. Select project: `wrhlkisiglmhncwqykac`
3. Click: **Authentication** → **Providers**
4. Find **Google** and toggle **Enable**
5. Note the **Callback URL**: 
   ```
   https://wrhlkisiglmhncwqykac.supabase.co/auth/v1/callback
   ```

#### **Step 2: Create Google OAuth App**

1. Go to: https://console.cloud.google.com
2. Create a new project (or select existing)
3. Go to: **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - App name: **YoLost**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**

4. Go to: **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: **YoLost Web App**
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://lost-and-found-pr4m.vercel.app
     ```
   - **Authorized redirect URIs**:
     ```
     https://wrhlkisiglmhncwqykac.supabase.co/auth/v1/callback
     ```
   - Click **Create**

5. **Copy** the Client ID and Client Secret

#### **Step 3: Add Credentials to Supabase**

1. Back in Supabase → Authentication → Providers → Google
2. Paste **Client ID**
3. Paste **Client Secret**
4. Click **Save**

#### **Step 4: Test**

1. Go to: https://lost-and-found-pr4m.vercel.app/login.html
2. Click **"Continue with Google"**
3. Should redirect to Google login
4. After login, should redirect back to dashboard

---

## 🐛 Common Errors

### Error: "An error occurred"

**Possible causes:**
1. ❌ No internet connection
2. ❌ Google OAuth not configured
3. ❌ Trying to access localhost from mobile
4. ❌ Supabase credentials expired

**Solutions:**
1. ✅ Check internet connection
2. ✅ Configure Google OAuth (see above)
3. ✅ Use Vercel URL instead: https://lost-and-found-pr4m.vercel.app
4. ✅ Check Supabase dashboard for errors

---

### Error: "Invalid redirect_uri"

**Cause**: Redirect URI not added to Google OAuth settings

**Solution:**
1. Go to Google Cloud Console
2. Edit OAuth 2.0 Client
3. Add to **Authorized redirect URIs**:
   ```
   https://wrhlkisiglmhncwqykac.supabase.co/auth/v1/callback
   ```

---

### Error: "Email/Password login works but Google doesn't"

**Cause**: Google OAuth provider not enabled or not configured

**Solution:**
- Follow "Google OAuth Not Working" steps above
- Make sure to save credentials in Supabase

---

## 🔍 Debug Steps

### 1. Check if app is accessible

**On PC:**
```
http://localhost:3000
```

**On Mobile (production):**
```
https://lost-and-found-pr4m.vercel.app
```

### 2. Check browser console

- Open browser
- Press F12 (or right-click → Inspect)
- Go to Console tab
- Look for red errors
- Share error messages

### 3. Test email login first

Before testing Google OAuth:
1. Try email/password login
2. If this works, issue is specific to Google OAuth
3. If this doesn't work, issue is with overall connectivity

### 4. Use debug page

**On PC:**
```
http://localhost:3000/test-google-auth.html
```

**On Mobile:**
```
https://lost-and-found-pr4m.vercel.app/test-google-auth.html
```

This page has debug buttons to test OAuth

---

## 📋 Quick Checklist

**For Email/Password Login:**
- ✅ Using correct URL (Vercel for mobile, localhost for PC)
- ✅ Internet connection working
- ✅ Supabase credentials correct

**For Google OAuth:**
- ✅ Google OAuth enabled in Supabase
- ✅ Google Cloud project created
- ✅ OAuth 2.0 Client ID created
- ✅ Redirect URI added correctly
- ✅ Client ID and Secret added to Supabase
- ✅ Using HTTPS (Vercel) not HTTP (localhost) for production

---

## 🚀 Recommended Testing Flow

1. **Test on PC with email/password first**
   ```
   http://localhost:3000/login.html
   ```

2. **Test on mobile with Vercel (email/password)**
   ```
   https://lost-and-found-pr4m.vercel.app/login.html
   ```

3. **Configure Google OAuth** (follow steps above)

4. **Test Google OAuth on PC**
   ```
   http://localhost:3000/login.html
   → Click "Continue with Google"
   ```

5. **Test Google OAuth on mobile**
   ```
   https://lost-and-found-pr4m.vercel.app/login.html
   → Click "Continue with Google"
   ```

---

## 📞 Still Having Issues?

1. Check the browser console for errors
2. Verify Supabase authentication settings
3. Make sure Google OAuth credentials are correct
4. Try using Vercel URL instead of localhost
5. Ensure you're on the same WiFi network (for local testing)

---

## ✅ Expected Behavior

**Email/Password Login:**
1. Enter email and password
2. Click Login
3. Redirects to dashboard
4. Shows user data

**Google OAuth:**
1. Click "Continue with Google"
2. Redirects to Google login page
3. Choose Google account
4. Redirects back to dashboard
5. Shows user data
6. User automatically created in database

---

**Need more help? Check the error message in browser console and search for it in this guide!**
