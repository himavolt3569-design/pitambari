import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CUSTOMER_COOKIE, SESSION_COOKIE } from "./cookies";

/**
 * The middleware gate and the session reader must agree on the cookie name.
 *
 * When they did not, a signed-in admin bounced between /admin and /admin/login
 * forever: the gate looked for a name nothing set, and the login page found a
 * perfectly valid session and sent them back. Nothing logged an error, because
 * from each side's point of view it was behaving correctly.
 */
describe("cookie names", () => {
  it("are the ones already issued to live browsers", () => {
    // Renaming either logs out every admin and detaches every customer from
    // their order history, so these are pinned deliberately.
    expect(SESSION_COOKIE).toBe("__tmg_session");
    expect(CUSTOMER_COOKIE).toBe("__tmg_customer");
  });

  it("are not re-declared anywhere outside this module", () => {
    // proxy.ts cannot import the session module, so the temptation to keep a
    // second copy of the name is permanent. This is the tripwire.
    for (const file of [
      "src/proxy.ts",
      "src/lib/auth/session.ts",
      "src/lib/commerce/customer-key.ts",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} hard-codes a cookie name`).not.toMatch(
        /=\s*["']__[a-z]+_(session|customer)["']/,
      );
    }
  });

  it("is what the middleware actually checks", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    expect(proxy).toContain('from "@/config/cookies"');
    expect(proxy).toContain("request.cookies.has(SESSION_COOKIE)");
  });
});
