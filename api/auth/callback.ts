import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrayerMap - Confirming Account</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #E8F4F8 0%, #D4E8ED 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 24px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E8F4F8;
      border-top-color: #4169E1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .button {
      display: inline-block;
      background: #4169E1;
      color: white;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.2s;
    }
    .button:hover {
      background: #3557c5;
    }
    .hidden {
      display: none;
    }
    .error {
      color: #dc2626;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="loading">
      <div class="spinner"></div>
      <div class="icon">🙏</div>
      <h1>Confirming Your Account</h1>
      <p>Please wait while we verify your email and open the PrayerMap app...</p>
    </div>

    <div id="success" class="hidden">
      <div class="icon">✅</div>
      <h1>Account Confirmed!</h1>
      <p>Your email has been verified. Tap the button below to open the app.</p>
      <a href="#" id="openAppBtn" class="button">Open PrayerMap App</a>
    </div>

    <div id="error" class="hidden">
      <div class="icon">⚠️</div>
      <h1 class="error">Something Went Wrong</h1>
      <p id="errorMessage">We couldn't verify your account. Please try signing up again.</p>
    </div>
  </div>

  <script>
    (function() {
      const loadingEl = document.getElementById('loading');
      const successEl = document.getElementById('success');
      const errorEl = document.getElementById('error');
      const openAppBtn = document.getElementById('openAppBtn');
      const errorMessage = document.getElementById('errorMessage');

      // Get the full URL including hash fragment
      const fullUrl = window.location.href;
      const hashFragment = window.location.hash;

      // Parse tokens from hash fragment (Supabase uses hash fragments)
      const params = new URLSearchParams(hashFragment.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        // Show error state
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorMessage.textContent = errorDescription || 'An error occurred during verification.';
        return;
      }

      if (accessToken && refreshToken) {
        // Build the app deep link with tokens
        const appUrl = 'prayermap://auth?access_token=' + encodeURIComponent(accessToken) + '&refresh_token=' + encodeURIComponent(refreshToken) + '&type=' + encodeURIComponent(type || 'signup');

        // Set the button href for manual tap
        openAppBtn.href = appUrl;

        // Try to open the app automatically
        setTimeout(function() {
          window.location.href = appUrl;
        }, 500);

        // Show success state after a delay (in case redirect doesn't work)
        setTimeout(function() {
          loadingEl.classList.add('hidden');
          successEl.classList.remove('hidden');
        }, 2000);
      } else {
        // No tokens found - show error
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorMessage.textContent = 'No verification tokens found. Please check your email link.';
      }
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
