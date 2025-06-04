import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ShareImportPage from "./pages/ShareImportPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { AboutPage } from "./components/AboutPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import UpcomingChargesPage from "./pages/UpcomingChargesPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Index now acts as a gatekeeper for auth/init */}
          <Route path="/" element={<Index />}>
            {/* DashboardLayout is a child, providing persistent UI */}
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} /> {/* Default to dashboard */}
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="upcoming-charges" element={<UpcomingChargesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>
          </Route>
          <Route path="/share/:shareId" element={<ShareImportPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
