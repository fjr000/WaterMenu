import { StrictMode } from "react";
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
import { LoginPage } from "./pages/login-page.tsx";
import { HomePage } from "./pages/home-page.tsx";
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

  if (auth.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-slate-500">加载中…</p>
      </div>
    );
  }

  if (!auth.user) {
    return <LoginPage />;
  }

  return <HomePage />;
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
    <App />
  </StrictMode>,
);
