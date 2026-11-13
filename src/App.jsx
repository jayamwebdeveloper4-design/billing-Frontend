import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import "./App.css";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const Customers = lazy(() => import("./pages/Customers"));
const NewOrder = lazy(() => import("./pages/NewOrder"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Profile = lazy(() => import("./pages/Profile"));
const GstSettings = lazy(() => import("./pages/GstSettings"));
const RevenueManagement = lazy(() => import("./pages/RevenueManagement"));
const SMTPSetting = lazy(() => import("./pages/SMTPSetting"));
const ReportManagement = lazy(() => import("./pages/ReportManagement"));
const Proforma = lazy(() => import("./pages/Proforma"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Expenses = lazy(() => import("./pages/Expenses/Expenses"));
const EmployeeTimeSheet = lazy(() => import("./pages/Expenses/EmployeeTimeSheet"));
const ProjectTimeSheet = lazy(() => import("./pages/Expenses/ProjectTimeSheet"));
function App() {
  const basename = import.meta.env.VITE_BASENAME || "/";
  const { isAuthenticated, loading } = useAuth();

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
      <Suspense
        fallback={
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-md">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-on-surface-variant font-bold text-[14px]">Loading Page...</p>
          </div>
        }
      >
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          {/* Protected Routes with Layout */}
          <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products/add" element={<AddProduct />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/website" element={<Customers isWebsiteOnly={true} />} />
            <Route path="/new-order/:customerId" element={<NewOrder />} />
            <Route path="/new-order/:customerId/:orderId" element={<NewOrder />} />
            <Route path="/renewal" element={<Reminders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/gst-settings" element={<GstSettings />} />
            <Route path="/proforma" element={<Proforma />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route
              path="/expenses/employee-timesheets/:employeeId"
              element={<EmployeeTimeSheet />}
            />
            <Route
              path="/expenses/project-timesheets/:projectId"
              element={<ProjectTimeSheet />}
            />
            <Route
              path="/employee-timesheets"
              element={<Navigate to="/expenses?view=employees" replace />}
            />
            <Route
              path="/project-timesheets"
              element={<Navigate to="/expenses?view=projects" replace />}
            />
            <Route path="/revenue" element={<RevenueManagement />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="/smtp-settings" element={<SMTPSetting />} />
            {/* Add other protected routes here */}
          </Route>
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
