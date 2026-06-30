import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Users,
  Globe,
  Lightbulb,
  Leaf,
  Calendar,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";


type StatConfig = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return { ref, inView };
}

function useCountUp({
  target,
  durationMs = 850,
  startWhen = true,
  decimals = 0,
}: {
  target: number;
  durationMs?: number;
  startWhen?: boolean;
  decimals?: number;
}) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startWhen) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = from + (to - from) * eased;

      setValue(current);

      if (t < 1) requestAnimationFrame(tick);
      else setValue(to);
    };

    requestAnimationFrame(tick);
  }, [startWhen, target, durationMs]);

  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;

  return rounded.toFixed(decimals);
}

const StatTile = ({ stat, start }: { stat: StatConfig; start: boolean }) => {
  const formatted = useCountUp({
    target: stat.value,
    durationMs: 800,
    startWhen: start,
    decimals: stat.decimals ?? 0,
  });

  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl border border-white/30 px-5 py-4 text-center">
      <p className="text-3xl font-bold text-white tabular-nums">
        {stat.prefix ?? ""}
        {formatted}
        {stat.suffix ?? ""}
      </p>
      <p className="text-xs text-white/80 uppercase tracking-[0.1em] font-semibold mt-2">{stat.label}</p>
    </div>
  );
};

const StaticStatTile = ({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
}) => {
  return (
    <div className="bg-white/15 backdrop-blur-lg rounded-2xl border border-white/30 px-5 py-4 text-center">
      <p className="text-3xl font-bold text-white tabular-nums">
        {prefix ?? ""}
        {value}
        {suffix ?? ""}
      </p>
      <p className="text-xs text-white/80 uppercase tracking-[0.1em] font-semibold mt-2">{label}</p>
    </div>
  );
};

const Homepage = () => {
  const [heroScroll, setHeroScroll] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 320, 1);
      setHeroScroll(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = ((event.clientX - innerWidth / 2) / innerWidth) * 40;
      const y = ((event.clientY - innerHeight / 2) / innerHeight) * 40;
      setParallax({ x, y });
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const missionAreas = useMemo(
    () => [
      {
        icon: <Lightbulb className="w-7 h-7" />,
        title: "Digital Skills & AI",
        description:
          "Immersive training, ethical AI literacy, and hands-on tech for future-ready youth.",
      },
      {
        icon: <Users className="w-7 h-7" />,
        title: "Social Entrepreneurship",
        description:
          "Building ventures that tackle real community challenges with measurable impact.",
      },
      {
        icon: <Globe className="w-7 h-7" />,
        title: "Intercultural Learning",
        description:
          "Erasmus+ exchanges that spark cultural fluency, co-creation, and lifelong networks.",
      },
      {
        icon: <Leaf className="w-7 h-7" />,
        title: "Sustainability",
        description:
          "Outdoor learning, climate literacy, and daily habits that protect our planet.",
      },
    ],
    []
  );

  const gallery = useMemo(
    () => [
      {
        title: "Be a Leader",
        location: "Targoviste, Romania",
        image: "/lovable-uploads/49b61ef9-3596-4028-bfde-d476a7bea249.png",
      },
      {
        title: "Act it Out!",
        location: "Debrecen, Hungary",
        image: "/lovable-uploads/c4c1f046-ccc5-4e93-852a-0da78fda170b.png",
      },
      {
        title: "AI Tools 4 Youth Work",
        location: "North Macedonia",
        image: "/lovable-uploads/14025e70-2537-4558-9ecb-3bde034b333f.png",
      },
      {
        title: "Digitalization Matters",
        location: "Germany",
        image: "/lovable-uploads/94060860-f177-45f6-8e5f-4455f97eb693.png",
      },
    ],
    []
  );

  // These animate
  const stats: StatConfig[] = useMemo(
    () => [
      { label: "Mission areas", value: 4 },
      { label: "Countries reached", value: 20, suffix: "+" },
      { label: "Non-profit", value: 100, suffix: "%" },
    ],
    []
  );

  const { ref: statsRef, inView: statsInView } = useInView<HTMLDivElement>({
    threshold: 0.25,
  });

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="cosmic-veil" aria-hidden />
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="holo-grid" />
      </div>

      <Navigation />

      <main className="overflow-hidden relative z-10">
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.25),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_32%)]" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="saber-trail" />
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="orb primary"
              style={{
                width: 360,
                height: 360,
                top: "-8%",
                left: "8%",
                transform: `translate3d(${parallax.x * 0.3}px, ${parallax.y * 0.25}px, 0)`,
              }}
            />
            <div
              className="orb accent"
              style={{
                width: 320,
                height: 320,
                bottom: "-10%",
                right: "6%",
                transform: `translate3d(${parallax.x * -0.25}px, ${parallax.y * -0.2}px, 0)`,
              }}
            />
            <div
              className="aurora-ribbon"
              style={{
                width: "150%",
                height: "62%",
                top: "-12%",
                left: "-18%",
                transform: `translate3d(${parallax.x * 0.08}px, ${parallax.y * 0.06}px, 0)`,
              }}
            />
            <div
              className="aurora-ribbon secondary"
              style={{
                width: "140%",
                height: "58%",
                bottom: "-18%",
                right: "-12%",
                transform: `translate3d(${parallax.x * -0.06}px, ${parallax.y * -0.05}px, 0)`,
              }}
            />
          </div>

          <div className="page-shell relative pt-20 pb-16 md:pb-24">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div
                className="text-white space-y-8 relative"
                style={{
                  transform: `translateY(${heroScroll * 10}px) scale(${
                    1 - heroScroll * 0.02
                  })`,
                  opacity: 1 - heroScroll * 0.12,
                  transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
                }}
              >
                <span className="accent-bar" aria-hidden />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm font-semibold">
                  Erasmus+ powered NGO <ShieldCheck className="w-4 h-4" />
                </div>

                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-white/70 mb-3">
                    Kaiserslautern • Europe
                  </p>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight max-w-3xl">
                    Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.
                  </h1>
                  <p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl">
                    We design high-energy learning journeys where youth,
                    technology, and sustainability meet — co-funded by the
                    European Union.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-slate-900 hover:-translate-y-0.5 transition-transform"
                  >
                    <Link to="/about">
                      Learn about IJBK
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/60 text-white bg-transparent hover:bg-white/10"
                  >
                    <Link to="/projects">See projects</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    <Link to="/join">
                      Partner with us
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {/* STATS */}
                <div
                  ref={statsRef}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                  {/* Static but visually identical */}
                  <StaticStatTile label="Founded" value={2025} />

                  {/* Animated tiles */}
                  {stats.map((stat) => (
                    <StatTile key={stat.label} stat={stat} start={statsInView} />
                  ))}
                </div>
              </div>

              <div className="panel bg-white/90 backdrop-blur-lg border-white/40 shadow-strong holo-card hover-lift">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="chip bg-primary/10 text-primary">
                      1. What we do
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Impact-first, youth-led
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Calendar className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h4 className="text-sm uppercase tracking-[0.18em] text-foreground font-bold">
                          Right now
                        </h4>
                        <p className="text-muted-foreground">
                          Opportunities in Svalbard, Martinique, Italy, Bulgaria, Germany, Austria, and Tunisia in the coming months. Stay updated!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Sparkles className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-semibold text-foreground">
                          EU-backed quality
                        </h4>
                        <p className="text-muted-foreground">
                          Program design aligned with Erasmus+ standards,
                          inclusive selection, and intercultural safety
                          practices.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION AREAS */}
        <section className="py-16 md:py-20 bg-gradient-subtle relative overflow-hidden scroll-fade">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "var(--gradient-radial)" }}
          />
          <div className="page-shell relative space-y-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  What matters to us
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold leading-tight mt-2">
                  Four mission areas, one bold youth agenda
                </h2>
              </div>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:translate-x-1 transition-transform"
              >
                Explore our story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {missionAreas.map((area) => (
                <Card
                  key={area.title}
                  className="panel-strong group h-full holo-card hover-lift"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition-transform">
                      {area.icon}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {area.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {area.description}
                      </p>
                    </div>
                    <div className="h-1 rounded-full bg-gradient-hero opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="pt-6 pb-16 md:pt-8 md:pb-20 bg-muted scroll-fade">
          <div className="page-shell space-y-10">
            <div className="text-center space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Field moments
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold">
                Snapshots from our journeys
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Youth exchanges, training courses, and cultural immersions across
                Europe — captured in motion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {gallery.map((item) => (
                <Card
                  key={item.title}
                  className="overflow-hidden group shadow-medium hover:shadow-strong transition-shadow duration-300 holo-card hover-lift"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.location}</p>
                  </CardContent>
                  <div className="absolute top-4 right-4 flex gap-2" aria-hidden>
                    <span className="pulse-dot" />
                    <span className="pulse-dot secondary" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PROGRAMS */}
        <section className="py-14 md:py-16 relative scroll-fade">
          <div className="page-shell space-y-7">
            <div className="flex flex-col items-start gap-3">
              <p className="text-base md:text-lg uppercase tracking-[0.2em] text-muted-foreground">
                Live & upcoming
              </p>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                Project radar
              </span>
            </div>

            <div className="grid gap-4">
              <Card className="border bg-background shadow-soft hover-lift">
                <CardContent className="p-5 md:p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        What we are preparing
                      </p>
                      <h3 className="mt-2 text-xl md:text-2xl font-semibold text-foreground leading-tight">
                        Next Erasmus+ calls are in design phase
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        In progress
                      </span>
                      <Button asChild className="shrink-0">
                        <Link to="/projects" className="inline-flex items-center">
                          Explore Projects
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                    We are shaping the next wave of inclusive, zero-fee mobility projects. Final topics, destinations, and partner confirmations are being aligned before publication.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current stage</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Project acceptance has been received</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Funding mode</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Erasmus+ supported</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Participation</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Zero participant fee</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* TRUST */}
       
        <section className="py-4 bg-background scroll-fade">
          <div className="page-shell py-0">
            <div className="flex flex-col md:flex-row items-center justify-center gap-5 
              rounded-xl border bg-muted/40 px-5 py-4 holo-card hover-lift shadow-soft">

              {/* Logos */}
              <div className="flex items-center gap-5 shrink-0">
                <img
                  src="/lovable-uploads/1c6cd6cd-95e8-4227-84d0-246ca492d9a8.png"
                  alt="Erasmus+ Programme"
                  className="h-9 w-auto object-contain"
                />
                <img
                  src="/lovable-uploads/10b5b39b-baa5-4822-aa8c-25a360e74a7a.png"
                  alt="Co-funded by the European Union"
                  className="h-9 w-auto object-contain"
                />
              </div>

              {/* Text */}
              <p className="text-sm text-muted-foreground text-center md:text-left max-w-2xl leading-snug">
                Our initiatives follow Erasmus+ quality standards with inclusive selection, intercultural facilitation, and participant safety at the core.
              </p>
            </div>
          </div>
        </section>


      </main>

      <Footer />
    </div>
  );
};

export default Homepage;
