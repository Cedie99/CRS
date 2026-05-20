import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { NextAuthConfig } from "next-auth";

const SESSION_CHECK_INTERVAL_MS = 30_000; // re-validate against DB at most once per 30s

export const STAFF_ROUTES: Record<string, string> = {
  sales_agent: "/agent",
  rsr: "/agent",
  sales_manager: "/manager",
  rsr_manager: "/manager",
  finance_reviewer: "/finance",
  legal_approver: "/legal",
  senior_approver: "/approver",
  sales_support: "/support",
  project_development_specialist: "/specialist",
  admin: "/admin",
};

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: { name: "cis.session-token" },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        // Fresh login — stamp everything including sessionVersion from DB
        token.id = user.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.role = user.role;
        token.agentCode = user.agentCode ?? null;
        token.agentType = user.agentType ?? null;
        token.avatarUrl = user.avatarUrl ?? null;
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.isTopManager = user.isTopManager ?? false;
        token.sessionVersion = user.sessionVersion ?? 1;
        token._checkedAt = Date.now();
      }

      // Called from client via useSession().update({ ... })
      if (trigger === "update") {
        if (session?.name !== undefined) token.name = session.name;
        if (session?.email !== undefined) token.email = session.email;
        if (session?.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
        if (session?.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
      }

      // Periodic DB check — validate isActive + sessionVersion (throttled to avoid a DB hit on every request)
      const now = Date.now();
      const lastChecked = (token._checkedAt as number) ?? 0;
      if (now - lastChecked > SESSION_CHECK_INTERVAL_MS) {
        const [row] = await db
          .select({ isActive: users.isActive, sessionVersion: users.sessionVersion })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);

        if (!row || !row.isActive || row.sessionVersion !== token.sessionVersion) {
          return null; // invalidates the JWT — user is logged out on next request
        }
        token._checkedAt = now;
      }

      return token;
    },
    session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.agentCode = token.agentCode ?? null;
        session.user.agentType = token.agentType ?? null;
        session.user.avatarUrl = token.avatarUrl ?? null;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
        session.user.isTopManager = token.isTopManager ?? false;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register");

      const isChangePasswordPage =
        pathname.startsWith("/change-password") ||
        pathname.startsWith("/api/auth/change-password");

      // Customer-facing form pages are public — no login required
      if (pathname.startsWith("/form") || pathname.startsWith("/api/form")) {
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

      // Force password change — redirect to /change-password for all non-change-password pages
      if ((auth.user as any).mustChangePassword && !isChangePasswordPage) {
        return Response.redirect(new URL("/change-password", nextUrl));
      }

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
          mustChangePassword: user.mustChangePassword,
          isTopManager: user.isTopManager,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
