import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import CreateCampaign from "./pages/CreateCampaign";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import ParticipantResult from "./pages/ParticipantResult";
import ChampionKit from "./pages/ChampionKit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/exemple" element={<Navigate to="/assessment?preview=1" replace />} />
            <Route path="/exemple/sales" element={<Navigate to="/assessment?preview=1&for=sales" replace />} />
            <Route path="/exemple/cs" element={<Navigate to="/assessment?preview=1&for=cs" replace />} />
            <Route path="/create-campaign" element={<CreateCampaign />} />
            <Route path="/kit" element={<ChampionKit />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/participant-result/:id" element={<ParticipantResult />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
