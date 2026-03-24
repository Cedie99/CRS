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
    jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.agentCode = user.agentCode ?? null;
        token.agentType = user.agentType ?? null;
        token.avatarUrl = user.avatarUrl ?? null;
      }
      // Called from client via useSession().update({ avatarUrl })
      if (trigger === "update" && session?.avatarUrl !== undefined) {
        token.avatarUrl = session.avatarUrl;
      }
      return token;
    },
    session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.agentCode = token.agentCode ?? null;
        session.user.agentType = token.agentType ?? null;
        session.user.avatarUrl = token.avatarUrl ?? null;
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
          avatarUrl: user.avatarUrl ?? null,
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
