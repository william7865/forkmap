// ============================================================
// lib/hooks/useAuthGuard.ts
// Client-side auth guard for protected pages.
// Use in /account and /favorites — redirects to home with
// auth modal trigger if session is absent.
// ============================================================
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";

interface Options {
  /** Where to redirect if not authed. Default: "/" */
  redirectTo?: string;
  /** Whether to open the auth modal on redirect. Default: true */
  openAuthModal?: boolean;
}

/**
 * Call at the top of any protected page component.
 * Returns { isReady, user } — render nothing until isReady.
 *
 * @example
 * const { isReady } = useAuthGuard();
 * if (!isReady) return <PageSkeleton />;
 */
export function useAuthGuard(options: Options = {}) {
  const { redirectTo = "/", openAuthModal = true } = options;
  const auth   = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for session check to complete
    if (auth.loading) return;

    if (!auth.user) {
      const url = openAuthModal
        ? `${redirectTo}?auth=required`
        : redirectTo;
      router.replace(url);
    }
  }, [auth.loading, auth.user, router, redirectTo, openAuthModal]);

  return {
    /** True once auth check is done AND user is logged in — safe to render */
    isReady: !auth.loading && !!auth.user,
    /** True while session is being fetched */
    isLoading: auth.loading,
    user: auth.user,
    auth,
  };
}
