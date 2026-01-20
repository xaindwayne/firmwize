import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/hooks/useAuth";

// Public pages
import Home from "./pages/Home";
import About from "./pages/About";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";

// Auth pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import KnowledgeBase from "./pages/admin/KnowledgeBase";
import Upload from "./pages/admin/Upload";
import Categories from "./pages/admin/Categories";
import ActivityLog from "./pages/admin/ActivityLog";
import Settings from "./pages/admin/Settings";
import AIChat from "./pages/admin/AIChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/booking" element={<Booking />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected admin routes */}
            <Route path="/admin" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/admin/knowledge" element={<RequireAuth><KnowledgeBase /></RequireAuth>} />
            <Route path="/admin/upload" element={<RequireAuth><Upload /></RequireAuth>} />
            <Route path="/admin/categories" element={<RequireAuth><Categories /></RequireAuth>} />
            <Route path="/admin/activity" element={<RequireAuth><ActivityLog /></RequireAuth>} />
            <Route path="/admin/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/admin/chat" element={<RequireAuth><AIChat /></RequireAuth>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;