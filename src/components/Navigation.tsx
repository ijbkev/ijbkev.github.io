import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShieldCheck } from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "What is Erasmus+", path: "/erasmus-plus" },
    { name: "Blog", path: "/blog" },
    { name: "Team", path: "/team" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 relative">
      <div className="absolute inset-0 h-full bg-white/80 backdrop-blur-xl border-b border-border pointer-events-none z-0" />
      <div className="absolute inset-0 h-full bg-gradient-to-r from-primary/5 via-transparent to-secondary/10 pointer-events-none z-0" />
      <div className="page-shell relative z-10">
        <nav className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 grid place-items-center">
              <img
                src="/logo.png"
                alt="IJBK logo"
                className="w-11 h-11 object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                Jugend & Bildung
              </span>
              <span className="text-xl font-semibold text-foreground">IJBK e.V.</span>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`relative text-sm font-semibold transition-colors ${
                  isActive(item.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{item.name}</span>
                {isActive(item.path) && (
                  <span className="absolute inset-x-0 -bottom-2 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/admin/reimbursements" aria-label="Administrator sign-in">
                <ShieldCheck className="w-4 h-4 mr-2" />Admin
              </Link>
            </Button>
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/projects">Projects</Link>
            </Button>
            <Button asChild className="shadow-soft hover:shadow-strong">
              <Link to="/contact">Let’s talk</Link>
            </Button>
          </div>

          <div className="xl:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-xl border-border gap-2"
              aria-label="Toggle navigation"
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="font-semibold">{isOpen ? "Close" : "Menu"}</span>
            </Button>
          </div>
        </nav>

        {isOpen && (
          <div id="mobile-navigation" className="xl:hidden pb-6 animate-slide-up">
            <div className="glass rounded-2xl p-4 shadow-medium border border-border/70">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-2 rounded-xl text-base font-semibold transition-colors ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <Link
                to="/admin/reimbursements"
                onClick={() => setIsOpen(false)}
                className="mt-4 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ShieldCheck className="w-4 h-4" />Admin sign-in
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/projects" onClick={() => setIsOpen(false)}>Projects</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/contact" onClick={() => setIsOpen(false)}>Let’s talk</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;
