# Going live on WhatsApp (Meta test number)

Every secret goes into Vercel only. Never paste one into chat, a commit or a file.

## 1. Storage (1 minute)
Open https://vercel.com/srijanaryas-projects/~/integrations/accept-terms/upstash?source=cli and accept the Upstash terms.
Then either tell Claude "terms accepted" (it finishes the install), or do it yourself:
Vercel → whatsapp-sales-desk → Storage → Create → Upstash for Redis → free plan → connect to all environments.

## 2. Meta developer app (about 10 minutes)
Use a NEW app. Do not touch the AI Classes app or its Mumbai 022 number.
1. https://developers.facebook.com/apps → **Create app** → use case **Other** → type **Business** → name it `Sales desk test`. Pick your business portfolio if asked (no verification is needed for the test number).
2. On the app dashboard, **Add product → WhatsApp → Set up**.
3. **WhatsApp → API Setup**. Meta has created a test number. Copy:
   - **Phone number ID** (under the "From" test number) → Vercel env `WA_PHONE_NUMBER_ID`
4. In the **To** field, choose **Manage phone number list**, add your own mobile number, and enter the code WhatsApp sends you. That registers you as one of the 5 allowed test recipients.
5. **Permanent token**, because the token on the API Setup page expires after about 24 hours:
   - https://business.facebook.com/settings → **Users → System users → Add**, name it `sales-desk`, role **Admin**.
   - **Assign assets → Apps → Sales desk test → Full control.**
   - **Generate new token** → app `Sales desk test` → expiry **Never** → permissions `whatsapp_business_messaging` and `whatsapp_business_management` → copy it → Vercel env `WA_ACCESS_TOKEN`.
   - (Shortcut for a same-day test: the temporary token on API Setup also works, but only until it expires.)
6. **App settings → Basic → App secret → Show** → Vercel env `WA_APP_SECRET`.
7. Invent a verify token, any long random string (for example from `openssl rand -hex 16`) → Vercel env `WA_VERIFY_TOKEN`.
8. Invent a desk password → Vercel env `LIVE_DESK_PASSWORD`. The `/live` page asks for it (any username works). It protects real phone numbers.

Add each one with **Vercel → whatsapp-sales-desk → Settings → Environment Variables**, Production environment, then tell Claude "env set". Claude redeploys, because env changes only take effect on a new deploy.

## 3. Webhook (after the redeploy)
1. Meta app → **WhatsApp → Configuration → Webhook → Edit**:
   - Callback URL: `https://whatsapp-sales-desk.vercel.app/api/whatsapp`
   - Verify token: the same string as `WA_VERIFY_TOKEN`
   - **Verify and save.**
2. Under **Webhook fields**, click **Subscribe** next to **messages**. Without this, nothing arrives.

## 4. Live check
From your phone, send WhatsApp messages to the test number, then open https://whatsapp-sales-desk.vercel.app/live :
1. Send "Hi, I'm interested in a franchise". An AI reply should arrive on your phone.
2. Send "Call me please". The chat should turn amber with "Human needed" on `/live`.
3. Press **Take over**, type a reply, and press **Send**. It should arrive on your phone.
