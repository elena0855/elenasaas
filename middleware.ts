import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Base64URL decoding helper for Edge runtime
function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public files and API routes to ignore
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get("token");
  const token = tokenCookie?.value;

  // 1. Unauthenticated redirects
  if (!token) {
    if (pathname.startsWith("/app") || pathname.startsWith("/admin") || pathname === "/activation") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const payload = decodeJwt(token);
  if (!payload) {
    // Bad token cookie, clear it and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  const uid = payload.sub; // Firebase user UID
  let role = payload.role || ""; // Custom claims role

  // If on login, redirect authenticated users
  if (pathname === "/login") {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/admin/companies", request.url));
    }
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  // 2. Super Admin Authorization
  if (pathname.startsWith("/admin")) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/app/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 3. Subscription & Licensing check (only for /app paths and /activation)
  if (pathname.startsWith("/app") || pathname === "/activation") {
    try {
      let status = "trial";
      let trialStartTimeStr = null;

            // Fetch from internal check-subscription API
      const subscriptionUrl = new URL(`/api/check-subscription?uid=${uid}`, request.url).toString();
      const res = await fetch(subscriptionUrl);

      if (res.status === 200) {
        const data = await res.json();
        status = data.status || "trial";
        trialStartTimeStr = data.trialStart;
        role = data.role || "user";
      }
      
      let trialExpiredAndGracePassed = false;
      if (status === "trial" && trialStartTimeStr) {
        const trialStart = new Date(trialStartTimeStr).getTime();
        const trialLength = 15 * 24 * 60 * 60 * 1000; // 15 days
        const gracePeriod = 15 * 24 * 60 * 60 * 1000; // 15 days
        const blockedTime = trialStart + trialLength + gracePeriod;

        if (Date.now() > blockedTime) {
          trialExpiredAndGracePassed = true;
        }
      }

      const isSuspended = status === "suspended";
      const isBlocked = isSuspended || trialExpiredAndGracePassed;

      if (isBlocked && pathname !== "/activation") {
        return NextResponse.redirect(new URL("/activation", request.url));
      }

      // If not blocked, and they are visiting /activation, redirect to app
      if (!isBlocked && pathname === "/activation") {
        return NextResponse.redirect(new URL("/app/dashboard", request.url));
      }
    } catch (error) {
      console.error("Middleware Firestore check error:", error);
      // In case of transient firestore error, fail open to avoid locking out users
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
