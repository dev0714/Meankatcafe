import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth.js";

const FALLBACK_SESSION_SECRET = "meankatcafe-session-secret-v1";

export type SessionData = {
  userId: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
  exp: number;
};

type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

export function getSession(cookieStore: CookieStoreLike = cookies()) {
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token, getSessionSecret());
  if (!payload) {
    return null;
  }

  return payload as SessionData;
}

export function getSessionSecret() {
  return process.env.SESSION_SECRET || FALLBACK_SESSION_SECRET;
}
