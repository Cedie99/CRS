import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { NextAuthConfig } from "next-auth";

const STAFF_ROUTES: Record<string, string> = {
  sales_agent: "/agent",
  rsr: "/agent",
  sales_manager: "/manager",
  rsr_manager: "/manager",
  finance_reviewer: "/finance",
  legal_approver: "/legal",
  senior_approver: "/approver",
  sales_support: "/support",
  admin: "/admin",
};

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.agentCode = (user as any).agentCode ?? null;
        token.agentType = (user as any).agentType ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.agentCode = (token.agentCode as string) ?? null;
        session.user.agentType = (token.agentType as any) ?? null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      // Customer-facing form pages are public — no login required
      if (
        nextUrl.pathname.startsWith("/form") ||
        nextUrl.pathname.startsWith("/api/form")
      ) {
        return true;
      }

      if (isAuthPage) {
        if (isLoggedIn) {
          const role = (auth.user as any).role as string;
          const dest = STAFF_ROUTES[role];
          if (dest) return Response.redirect(new URL(dest, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;
      return true;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.isActive) return null;

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          agentCode: user.agentCode,
          agentType: user.agentType,
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
