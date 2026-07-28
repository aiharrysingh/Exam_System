import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
// Weight axis only; all subsets are declared but gated by unicode-range, so a
// Latin UI only ever downloads the Latin woff2.
import "@fontsource-variable/inter/wght.css";
import "./index.css";
import App from "./App.tsx";
import { AppToaster } from "./lib/toast.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" degrades every motion component in the app to
          opacity-only when the OS asks for it — one switch, full coverage. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
          <AppToaster />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>
);
