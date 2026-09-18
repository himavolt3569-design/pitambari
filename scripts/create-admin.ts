import { initAdminApp } from "./lib/admin-app.ts";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !email.includes("@") || !password || password.length < 6) {
  console.error("Usage: pnpm create-admin <email> <password (min 6 chars)>");
  process.exit(1);
}

const projectId = initAdminApp("create-admin");

async function main() {
  const auth = getAuth();
  let user = await auth.getUserByEmail(email).catch(() => null);

  if (!user) {
    console.log(`Creating new user account for ${email}...`);
    user = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: "Super Admin",
    });
    console.log(`Created user ${user.uid}.`);
  } else {
    console.log(`User ${email} already exists. Updating password...`);
    await auth.updateUser(user.uid, { password });
  }

  console.log("Setting superAdmin custom claim...");
  await auth.setCustomUserClaims(user.uid, { superAdmin: true });
  await auth.revokeRefreshTokens(user.uid);

  console.log("\n==========================================");
  console.log(`SUCCESS! Super Admin account configured:`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Access:   http://localhost:3000/admin/login`);
  console.log("==========================================\n");
}

main().catch((error) => {
  if (error.code === "auth/configuration-not-found") {
    console.error(
      "\n[!] Firebase Authentication is not yet enabled in your Firebase project.\n" +
        "Please visit: https://console.firebase.google.com/project/" +
        projectId +
        "/authentication\n" +
        "1. Click 'Get Started'\n" +
        "2. Click 'Email/Password' under Sign-in providers and toggle 'Enable'\n" +
        "3. Re-run this command.\n",
    );
  } else {
    console.error("Failed to create admin:", error);
  }
  process.exit(1);
});
