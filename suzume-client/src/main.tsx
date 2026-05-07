import "@radix-ui/themes/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Theme
          appearance="dark"
          accentColor="iris"
          grayColor="slate"
          radius="large"
          panelBackground="solid"
          scaling="100%"
        >
          <App />
        </Theme>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
