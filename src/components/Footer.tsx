import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

const Footer = () => {
  return (
    <footer className="mt-24">
      <div className="relative overflow-hidden rounded-t-[32px] bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.25),transparent_35%)]" />
        <div className="page-shell relative py-14">
          <div className="panel bg-white/5 border-white/10 backdrop-blur-xl text-slate-100 mb-12">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-8 md:p-10">
              <div>
                <p className="uppercase tracking-[0.2em] text-xs text-slate-300 mb-2">Let’s build together</p>
                <h3 className="text-2xl md:text-3xl font-semibold leading-tight">
                  Ready to co-create youth projects that travel across Europe?
                </h3>
              </div>
              <div className="flex gap-3">
                <ButtonLink to="/projects" variant="ghost">
                  Browse programs
                </ButtonLink>
                <ButtonLink to="/contact">Start a conversation</ButtonLink>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-hero grid place-items-center text-white font-bold shadow-glow">
                  IJ
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">International youth</p>
                  <p className="text-xl font-semibold">IJBK e.V.</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed max-w-xl">
                Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. (VR 31177) — a registered non-profit
                connecting youth, technology, and sustainability through Erasmus+ collaborations.
              </p>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>Gerhart-Hauptmann-Str. 24, 216A • 67663 Kaiserslautern</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <a href="mailto:ijbk.connect@gmail.com" className="hover:text-white transition-colors">
                    ijbk.connect@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <a
                    href="https://wa.me/4915253482040"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    +49 152 53482040
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm uppercase tracking-[0.16em] text-slate-300">Explore</h4>
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/projects">Projects</FooterLink>
              <FooterLink to="/team">Team</FooterLink>
              <FooterLink to="/blog">Stories</FooterLink>
              <FooterLink to="/join">Partnership</FooterLink>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm uppercase tracking-[0.16em] text-slate-300">Stay connected</h4>
              <a
                href="https://www.instagram.com/ijbk.ev"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-slate-200 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <span className="grid place-items-center w-9 h-9 rounded-full bg-white/10 border border-white/10 group-hover:bg-white/20">
                  <Instagram size={18} />
                </span>
                <span className="font-medium">instagram.com/ijbk.ev</span>
                <ArrowUpRight size={16} className="opacity-70" />
              </a>
              <p className="text-sm text-slate-300">
                Erasmus+ funded journeys, intercultural experiences, and youth innovation updates.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-4 md:items-center justify-between text-sm text-slate-300">
            <span>© 2025 IJBK e.V. Registered non-profit organization.</span>
            <span>Projects co-funded by the Erasmus+ Programme of the European Union.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const ButtonLink = ({
  to,
  children,
  variant = "solid",
}: {
  to: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition-all";
  if (variant === "ghost") {
    return (
      <Link
        to={to}
        className={`${base} border border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`${base} bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-strong`}
    >
      {children}
    </Link>
  );
};

const FooterLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors font-medium"
  >
    <span className="w-2 h-2 rounded-full bg-white/50" />
    {children}
  </Link>
);

export default Footer;
