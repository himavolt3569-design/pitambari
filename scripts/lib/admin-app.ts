import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

/**
 * Credentials for the command line scripts.
 *
 * Two ways in, matching src/lib/firebase/admin.ts so a machine configured for
 * the app is already configured for these:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS   path to the service account JSON, which
 *                                    keeps one copy of the key on disk
 *   FIREBASE_CLIENT_EMAIL +          the same values pasted in directly, for a
 *   FIREBASE_PRIVATE_KEY             host that cannot mount a file
 *
 * Exits with an explanation rather than a stack trace when neither is set.
 */
export function initAdminApp(command: string): string {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;

  if (!projectId) {
    console.error(
      "Missing FIREBASE_PROJECT_ID in .env.local.\n" +
        `Set it, then run: pnpm ${command}`,
    );
    process.exit(1);
  }

  if (getApps().length) return projectId;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && rawKey) {
    // A key pasted into a dashboard field often still carries its quotes, and
    // a host that stores it on one line keeps the newlines escaped.
    const unquoted = rawKey.replace(/^\s*["']|["']\s*$/g, "");
    const privateKey = unquoted.includes("\n")
      ? unquoted.replace(/\n/g, "\n")
      : unquoted;

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    return projectId;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault(), projectId });
    return projectId;
  }

  console.error(
    "Missing Firebase credentials.\n" +
      "Either point GOOGLE_APPLICATION_CREDENTIALS at the service account\n" +
      "JSON, or set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, in\n" +
      `.env.local. Then run: pnpm ${command}`,
  );
  process.exit(1);
}
