# Vortex-Code Store

Vortex-Code is a digital voucher store with real-time stock management, secure server-side admin controls, Google Identity OAuth, and real FamGateway payment integration.

---

## Hostinger Environment Variables

When deploying this application on Hostinger using hPanel's **Node.js Dashboard** or **Git Deployment**, you must configure the following Environment Variables under the "Set environment variables" screen:

| Key | Description / Value |
| :--- | :--- |
| **`GEMINI_API_KEY`** | Your actual Google Gemini API Key (required for automated assistant/AI features if enabled). |
| **`APP_URL`** | Your final deployed production domain URL. Example: `https://mydomain.com`. |
| **`FAMUPIGATEWAY_BASE_URL`** | The API base URL of the FamGateway provider. Default: `https://famupigateway.site/api` (keep this unless your provider specifies a different production URL). |
| **`FAMUPIGATEWAY_API_KEY`** | Your actual production API Key provided by FamGateway. |
| **`FAMUPIGATEWAY_WEBHOOK_SECRET`** | Your production webhook verification secret signature provided by FamGateway to verify incoming payment webhooks safely. |
| **`FAMUPIGATEWAY_EXPIRY_MINUTES`** | Enter `5` (specifies the minutes allowed for the QR code and payment session before expiration). |

---

## Production Deployment Steps on Hostinger

1. **Upload / Clone Code**: Clone the repository directly to your Hostinger directory using Git Integration or upload the compiled files using the File Manager.
2. **Setup Node.js App**:
   - In Hostinger hPanel, go to **Node.js** under the Advanced menu.
   - Set **App Directory** to your upload directory (e.g., `public_html`).
   - Set **Application Startup File** to `server.js` (which is generated after the build completes).
3. **Environment Variables**: Open Hostinger's environment variables screen and enter each Key-Value pair listed in the table above.
4. **Install & Build**: Run `npm install` and then `npm run build` to generate the static files (`dist`) and compile the server bundle (`server.js`).
5. **Start Application**: Click **Start** in the Hostinger Node.js app manager.
