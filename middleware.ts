import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Public routes (no authentication required)
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook/register",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;

  /* -------------------------------
     Unauthenticated user handling
  --------------------------------*/
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (!userId) return;

  /* -------------------------------
     Authenticated user handling
  --------------------------------*/
  try {
    const client = await clerkClient(); // ✅ clerkClient is async
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role as string | undefined;

    // Admin accessing /dashboard → redirect
    if (role === "admin" && pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    // Non-admin accessing admin routes → block
    if (role !== "admin" && pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Authenticated users visiting public routes → redirect
    if (isPublicRoute(req)) {
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin/dashboard" : "/dashboard", req.url)
      );
    }
  } catch (error) {
    console.error("Error fetching user data from Clerk:", error);
    return NextResponse.redirect(new URL("/error", req.url));
  }
});
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
