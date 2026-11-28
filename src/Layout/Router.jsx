import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../context/AuthContext';

import Customer from '../Feature/Customers/Customer';
import CustomerDetails from '../Feature/Customers/CustomerDetails';
import Renewal from '../Feature/Renewals/Renewal';
import SMTPSetting from '../Feature/SMTP/SMTPSetting';
import GstSettings from '../Feature/GstSettings/GstSettings';
import Proforma from '../Feature/Prodorma/Proforma';
import Profile from '../Feature/Profile/Profile';

// Lazy-loaded pages
const Login = lazy(() => import('../pages/login'));
const Dashboard = lazy(() => import('../pages/dashboard'));
const Product = lazy(() => import('../Feature/Product/Product'));
const NewCustomerOrder = lazy(() => import('../Feature/CustomerProduct/NewOder'));
const RevenueManagement = lazy(() => import('../Feature/Revenues/Revenue'));
const ReportManagement = lazy(() => import('../Feature/Report/Report'));
const Invoices = lazy(() => import('../Feature/Invoice/Invoices'));
const Expenses = lazy(() => import('../Feature/Expenses/Expenses'));
const EmployeeTimeSheet = lazy(() => import('../Feature/Expenses/EmployeeTimeSheet'));
const ProjectTimeSheet = lazy(() => import('../Feature/Expenses/ProjectTimeSheet'));

const AppRouter = () => {
  const { isAuthenticated } = useAuth();

  return (
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
          <Route path="/products" element={<Product />} />
          <Route path="/products/add" element={<Product />} />
          <Route path="/customers" element={<Customer />} />
          <Route path="/customers/:id" element={<CustomerDetails />} />
          <Route path="/customer/:id" element={<CustomerDetails />} />
          <Route path="/new-order/:customerId" element={<NewCustomerOrder />} />
          <Route path="/new-order/:customerId/:orderId" element={<NewCustomerOrder />} />
          <Route path="/renewal" element={<Renewal />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/gst-settings" element={<GstSettings />} />
          <Route path="/gst-setting" element={<GstSettings />} />
          <Route path="/proforma" element={<Proforma />} />
          <Route path="/proformas" element={<Proforma />} />
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
          <Route path="/smtp-setting" element={<SMTPSetting />} />
          <Route path="/smtp" element={<SMTPSetting />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;

