import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("postflow_token")?.value;
  const { pathname } = request.nextUrl;

  // Routes that redirect logged-in users away (auth pages like login/register)
  // [FIX #17] /verify-email retiré de authOnlyRoutes.
  // Avant: Un utilisateur avec un cookie postflow_token (même expiré) était
  // redirigé de /verify-email vers /dashboard, puis vers /login si le token
  // était invalide — perdant ainsi l'URL de vérification email.
  // Maintenant: /verify-email est toujours accessible même avec un cookie,
  // permettant à un utilisateur connecté de vérifier son email après un
  // changement d'adresse ou une ré-inscription.
  const authOnlyRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

  // Routes accessible without auth (but don't redirect if logged in)
  // /verify-email et /confirm-delete-account sont accessibles même si
  // l'utilisateur a un token, car ces pages ont leur propre logique de
  // validation de token (email verification token, deletion token).
  const publicAccessRoutes = ["/verify-email", "/confirm-delete-account"];

  // If user is logged in and trying to access auth-only pages, redirect to dashboard
  if (token && authOnlyRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not logged in and trying to access protected routes, redirect to login
  if (
    !token &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/projects") ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/tags"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Public access routes are always accessible regardless of token state
  // (verify-email, confirm-delete-account handle their own auth via URL tokens)
  if (publicAccessRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/calendar/:path*",
    "/settings/:path*",
    "/tags/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/confirm-delete-account",
  ],
};
