/**
 * Cookie names, defined once.
 *
 * This module deliberately imports nothing. proxy.ts runs as middleware and
 * cannot import lib/auth/session.ts, which pulls in firebase-admin, so before
 * this existed the middleware kept its own copy of the session cookie name.
 * The two drifted during the rebrand: the gate started looking for a cookie
 * that nothing ever set, so a correctly signed-in admin was redirected to the
 * login page, which saw a valid session and redirected straight back. An
 * endless bounce between /admin and /admin/login, with no error anywhere.
 *
 * Renaming either of these logs out every admin and detaches every customer
 * from the orders they placed, so change them only with a migration in hand.
 */

/** Firebase session cookie for staff. httpOnly, set only by the server. */
export const SESSION_COOKIE = "__tmg_session";

/** Opaque key tying a browser to the orders it placed. Never shown or sent. */
export const CUSTOMER_COOKIE = "__tmg_customer";
