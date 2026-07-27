import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryDefaults } from "@visualtaste/api";
import App from "./App";
import "./index.css";

// Sin esto, el default de React Query (staleTime 0, refetchOnWindowFocus true)
// dispara un refetch de TODAS las queries activas cada vez que se vuelve a la
// pestaña del navegador — visible en Platos como un overlay a pantalla
// completa cada vez que cambias de pestaña y vuelves.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...getQueryDefaults(),
      refetchOnWindowFocus: false,
    },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
    <QueryClientProvider client={queryClient}>   {/* <-- Envuelve aquí */}
    <AuthProvider>
      <App />
    </AuthProvider>
    </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);