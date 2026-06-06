import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) {
        return false;
      }

      const accessToken = account.access_token;
      const refreshToken = account.refresh_token;

      if (!accessToken) {
        console.error("Missing Google access token in sign-in callback");
        return false;
      }

      try {
        // Find if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // We only overwrite the refresh token if a new one is provided.
        // Google OAuth only sends the refresh_token on the first login or when prompt=consent.
        const tokenData = {
          name: user.name ?? "",
          accessToken: accessToken,
          ...(refreshToken ? { refreshToken: refreshToken } : {}),
        };

        if (existingUser) {
          await prisma.user.update({
            where: { email: user.email },
            data: tokenData,
          });
        } else {
          if (!refreshToken) {
            console.error("No refresh token received for new user");
            return false;
          }
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "",
              accessToken: accessToken,
              refreshToken: refreshToken,
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Error saving user OAuth tokens during sign-in:", error);
        return false;
      }
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
