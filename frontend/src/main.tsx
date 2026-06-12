import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  authMeKey,
  AuthProvider,
  isUnauthorized,
  useAuth,
} from "./hooks/use-auth.tsx";
import { ErrorBoundary } from "./components/error-boundary.tsx";
import { LoginPage } from "./pages/login-page.tsx";
import { HomePage } from "./pages/home-page.tsx";
import { InvitePage } from "./pages/invite-page.tsx";
import "./index.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleUnauthorizedError,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorizedError,
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function handleUnauthorizedError(error: unknown) {
  if (isUnauthorized(error)) {
    queryClient.setQueryData(authMeKey, null);
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
  }
}

function AppRoutes() {
  const auth = useAuth();
  const pathname = usePathname();
  const inviteToken = getInviteToken(pathname);

  if (auth.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-slate-500">加载中…</p>
      </div>
    );
  }

  if (inviteToken) {
    return <InvitePage token={inviteToken} />;
  }

  if (!auth.user) {
    return <LoginPage />;
  }

  return <HomePage />;
}

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return pathname;
}

function getInviteToken(pathname: string) {
  const match = /^\/invite\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
