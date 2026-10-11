# Vortex-Code Store

Vortex-Code is a digital voucher store with real-time stock management, secure server-side admin controls, Google Identity OAuth, and official Trust Gateway UPI payments integration.

---

## Environment Variables Configuration

When deploying this application on Hostinger, Cloud Run, Vercel, Railway, or VPS, configure the following Environment Variables under your hosting dashboard:

| Key | Required | Description / Value |
| :--- | :--- | :--- |
| **`TRUST_GATEWAY_API_KEY`** | **Yes** | Your private Trust Gateway API Key from https://trustgateway.in dashboard. (Server-side only). |
| **`TRUST_GATEWAY_WEBHOOK_SECRET`** | Recommended | Your webhook signing secret for verifying `X-Gateway-Signature` HMAC-SHA256 headers. |
| **`TRUST_GATEWAY_BASE_URL`** | Optional | Defaults to `https://trustgateway.in`. |
| **`APP_URL`** | Recommended | Your final deployed production domain URL (e.g., `https://vortexcode.shop`). |
| **`GEMINI_API_KEY`** | Optional | Google Gemini API Key for server-side AI capabilities if enabled. |

### Webhook & Callback URLs
In your Trust Gateway merchant dashboard, configure:
- **Webhook URL**: `https://yourdomain.com/api/payment/webhook` (Method: POST)
- **Callback / Redirect URL**: `https://yourdomain.com/api/payment/callback` (Method: GET)

---

## Production Deployment Steps

1. **Deployment Architecture**:
   - The application runs full-stack in a single unified Node.js deployment.
   - Vite compiles the React SPA frontend into `/dist`.
   - esbuild bundles the Express API server and Trust Gateway service into `/server.js`.
   - `npm run build` builds both frontend and backend bundles together.
   - `npm start` executes `node server.js` which serves both the API routes (`/api/*`) and the static SPA frontend.
2. **Environment Variables**:
   - Add `TRUST_GATEWAY_API_KEY` and `TRUST_GATEWAY_WEBHOOK_SECRET` in your hosting dashboard environment settings.
3. **Build & Start**:
   - Run `npm install`
   - Run `npm run build`
   - Run `npm start`
