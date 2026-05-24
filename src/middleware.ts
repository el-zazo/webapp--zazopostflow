import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("postflow_token")?.value;
  const { pathname } = request.nextUrl;

  // Routes that redirect logged-in users away (auth pages like login/register)
  const authOnlyRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

  // Routes accessible without auth (but don't redirect if logged in)
  const publicAccessRoutes = ["/confirm-delete-account"];

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
