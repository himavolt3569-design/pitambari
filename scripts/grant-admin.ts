/**
 * Grants or revokes super admin access.
 *
 *   pnpm grant-admin someone@example.com
 *   pnpm grant-admin someone@example.com --revoke
 *
 * Admin access is a Firebase custom claim, not a database row, so it is carried
 * inside the signed token and verified on every request. There is deliberately
 * no way to grant this from inside the application: it requires the service
 * account and a terminal.
 */
import { initAdminApp } from "./lib/admin-app.ts";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email || !email.includes("@")) {
  console.error("Usage: pnpm grant-admin <email> [--revoke]");
  process.exit(1);
}

initAdminApp("grant-admin");

async function main() {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email).catch(() => null);

  if (!user) {
    console.error(
      `No Firebase Auth user with the email ${email}.\n` +
        "Create the account first in the Firebase console under Authentication,\n" +
        "using the Email/Password provider, then run this again.",
    );
    process.exit(1);
  }

  await auth.setCustomUserClaims(user.uid, revoke ? null : { superAdmin: true });

  // Force existing sessions to be re-evaluated against the new claim.
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    revoke
      ? `Revoked admin access for ${email}. Existing sessions have been ended.`
      : `Granted admin access to ${email}. They can now sign in at /admin/login.`,
  );
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
