export { auth as proxy } from "@/lib/auth";

export const config = {
  // Protect all routes except static files, next internals, and auth API
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
