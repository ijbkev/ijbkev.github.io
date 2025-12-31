import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="uppercase tracking-[0.2em] text-sm text-white/70">Page missing</p>
        <h1 className="text-5xl font-semibold">404</h1>
        <p className="text-white/80">
          We can’t find the page you’re looking for. Let’s get you back to youth adventures.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 px-5 py-3 font-semibold hover:-translate-y-0.5 transition-transform"
        >
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
