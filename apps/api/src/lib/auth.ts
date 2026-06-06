import { decode } from "next-auth/jwt";
import { getCookie } from "hono/cookie";
import { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { prisma } from "./prisma.js";
import { User } from "@prisma/client";

export type AuthVariables = {
  user: User;
};

export async function getAuthUser(c: Context): Promise<User | null> {
  const sessionToken =
    getCookie(c, "next-auth.session-token") ||
    getCookie(c, "__Secure-next-auth.session-token");

  if (!sessionToken) {
    return null;
  }

  try {
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET || "",
    });

    if (!decoded || !decoded.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    return user;
  } catch (error) {
    console.error("Error decoding session token in Hono backend:", error);
    return null;
  }
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", user);
    await next();
  }
);
