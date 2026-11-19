# Authentication email delivery checklist

The application sends account confirmation and password-reset requests through Supabase Auth. The client code cannot deliver email by itself: the Supabase/Lovable Cloud Auth project must have email confirmation enabled and a working email provider.

## Required backend configuration

1. Open the Supabase project connected to the published MOPSENTRY app (or the Lovable Cloud project settings that manage its Supabase Auth service).
2. In **Authentication → URL Configuration**, add the published app URL to the allowed redirect URLs:
   - `https://mopsentry-bot.lovable.app/dashboard`
   - `https://mopsentry-bot.lovable.app/auth`
   - `https://mopsentry-bot.lovable.app/auth?mode=recovery`
   Include the exact development URLs only if they are intentionally used.
3. In **Authentication → Providers → Email**, confirm that email sign-up is enabled and review whether email confirmation is required.
4. Configure a supported SMTP provider in the Auth SMTP settings. Verify the sender address/domain with that provider and use its SMTP credentials. Do not put SMTP credentials in the repository, frontend code, or GitHub commits.
5. Review the **Authentication → Email Templates** for confirmation and password recovery. Keep the confirmation link using the provider's confirmation URL placeholder and the recovery link using the recovery URL placeholder. Do not hard-code a user-specific token or URL.
6. Check **Authentication → Logs** (and the SMTP provider's delivery/bounce logs) after requesting a confirmation or reset email. A successful client response only means the Auth request was accepted; it does not prove inbox delivery.
7. Test with a real mailbox, including spam/junk, and verify both confirmation and password recovery links return to the published app.

## App routes

- Sign-up sends a confirmation redirect to `/dashboard`.
- Forgot password sends a recovery redirect to `/auth?mode=recovery`.
- The auth page handles the recovery session and lets the user set a new password.

## Important

This repository change adds the client-side recovery flow and clearer status messages. It cannot provision SMTP, verify a sender domain, change hosted Auth settings, or inspect private delivery logs. Those steps must be completed in the connected Supabase/Lovable Cloud project by an authorized project administrator.