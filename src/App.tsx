import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Homepage from "./pages/Homepage";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Join from "./pages/Join";
import Contact from "./pages/Contact";
import ErasmusPlus from "./pages/ErasmusPlus";
import NotFound from "./pages/NotFound";
import WhatsAppWidget from "./components/WhatsAppWidget";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        <div className="cosmic-veil" aria-hidden />
        <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
          <div className="holo-grid" />
        </div>
        <div className="relative z-10">
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/team" element={<Team />} />
              <Route path="/join" element={<Join />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/erasmus-plus" element={<ErasmusPlus />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <WhatsAppWidget />
          </BrowserRouter>
        </div>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
