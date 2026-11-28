import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import AppRouter from "./Layout/Router";
import "./App.css";

function App() {
  const basename = import.meta.env.VITE_BASENAME || "/";
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-md">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-bold">Verifying Session...</p>
      </div>
    );
  }

  return (
    <Router basename={basename}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "#ffffff",
            color: "#1a1c1e",
            borderRadius: "8px",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: "500",
          },
          success: {
            iconTheme: {
              primary: "#0061a4",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ba1a1a",
              secondary: "#fff",
            },
          },
        }}
      />
      <AppRouter />
    </Router>
  );
}

export default App;
