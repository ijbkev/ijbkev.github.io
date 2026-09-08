import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  Palette,
} from "lucide-react";
import { Link } from "react-router-dom";


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

type MissionArea = {
  icon: ReactNode;
  title: string;
  description: string;
  iconClass: string;
  barClass: string;
};

const MissionAreaCard = ({ area, index }: { area: MissionArea; index: number }) => (
  <Card className="panel-strong group relative h-full overflow-hidden holo-card hover-lift">
    <span
      className="absolute -top-2 right-3 text-6xl font-bold text-foreground/[0.06] select-none pointer-events-none"
      aria-hidden
    >
      {String(index + 1).padStart(2, "0")}
    </span>
    <CardContent className="p-6 space-y-4">
      <div
        className={`w-14 h-14 rounded-2xl grid place-items-center transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${area.iconClass}`}
      >
        {area.icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{area.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{area.description}</p>
      </div>
      <div
        className={`h-1 w-10 rounded-full transition-all duration-300 group-hover:w-full ${area.barClass}`}
      />
    </CardContent>
  </Card>
);

type FieldMoment = { title: string; location: string; image: string };

const FieldMomentTile = ({ item, tilt = 0 }: { item: FieldMoment; tilt?: number }) => (
  <figure
    className="journey-postcard relative w-56 sm:w-64 shrink-0 rounded-lg bg-[#fffaf0] p-2.5 pb-4 border border-[#e9dfca]"
    style={{ "--postcard-tilt": `${tilt}deg` } as CSSProperties}
  >
    <div className="h-40 sm:h-44 overflow-hidden rounded-sm bg-[#eee5d3]">
      <img
        src={item.image}
        alt={`${item.title} — ${item.location}`}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
    <figcaption className="px-2 pt-3 min-h-[84px]">
      <h3 className="text-[#061b49] font-semibold text-sm leading-snug">{item.title}</h3>
      <p className="text-[#6c6559] text-xs mt-2 flex items-center gap-2">
        <span className="h-px w-5 bg-[#c5a04f] shrink-0" aria-hidden="true" />
        {item.location}
      </p>
    </figcaption>
  </figure>
);

const Homepage = () => {
  const [heroScroll, setHeroScroll] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 320, 1);
      setHeroScroll(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const missionAreas = useMemo(
    () => [
      {
        icon: <Lightbulb className="w-7 h-7" />,
        title: "Digital Skills & AI",
        description:
          "Immersive training, ethical AI literacy, and hands-on tech for future-ready youth.",
        iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        barClass: "bg-blue-500",
      },
      {
        icon: <Users className="w-7 h-7" />,
        title: "Social Entrepreneurship",
        description:
          "Building ventures that tackle real community challenges with measurable impact.",
        iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        barClass: "bg-amber-500",
      },
      {
        icon: <Globe className="w-7 h-7" />,
        title: "Intercultural Learning",
        description:
          "Erasmus+ exchanges that spark cultural fluency, co-creation, and lifelong networks.",
        iconClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
        barClass: "bg-cyan-500",
      },
      {
        icon: <Leaf className="w-7 h-7" />,
        title: "Sustainability",
        description:
          "Outdoor learning, climate literacy, and daily habits that protect our planet.",
        iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        barClass: "bg-emerald-500",
      },
      {
        icon: <Palette className="w-7 h-7" />,
        title: "Dance & Cultural Arts",
        description:
          "Dance, theatre, and cultural arts — a new creative frontier we're just beginning to explore with young people.",
        iconClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        barClass: "bg-rose-500",
      },
    ],
    []
  );

  const fieldMoments = useMemo(() => {
    const projectPhotos = [
      {
        title: "Green Stage for Sustainable Future",
        location: "Steinsholt, Norway",
        images: Array.from({ length: 12 }, (_, i) => `/lovable-uploads/gogreen/${i + 1}.jpg`),
      },
      {
        title: "DiscoverEU Memories",
        location: "Across Europe",
        images: [
          "1000167767",
          "1000167768",
          "1000167769",
          "1000167770",
          "1000167771",
          "1000167772",
          "1000167773",
          "1000167774",
          "1000167801",
          "1000167802",
          "1000167803",
        ].map((name) => `/lovable-uploads/discoverEU/${name}.jpg`),
      },
      {
        title: "Digitalisation Matters",
        location: "Euskirchen, Germany",
        images: [
          ...Array.from({ length: 5 }, (_, i) => `/lovable-uploads/digimat/${i + 1}.jpg`),
          "/lovable-uploads/94060860-f177-45f6-8e5f-4455f97eb693.png",
        ],
      },
      {
        title: "Act it Out!",
        location: "Debrecen, Hungary",
        images: [
          "/lovable-uploads/c4c1f046-ccc5-4e93-852a-0da78fda170b.png",
          "/lovable-uploads/act-it-out.jpg",
        ],
      },
      {
        title: "Be a Leader",
        location: "Targoviste, Romania",
        images: ["/lovable-uploads/49b61ef9-3596-4028-bfde-d476a7bea249.png"],
      },
      {
        title: "AI Tools 4 Youth Work",
        location: "North Macedonia",
        images: ["/lovable-uploads/14025e70-2537-4558-9ecb-3bde034b333f.png"],
      },
    ];

    // Interleave projects round-robin so consecutive tiles rarely share the same trip.
    const queues = projectPhotos.map((project) => [...project.images]);
    const interleaved: { title: string; location: string; image: string }[] = [];
    let remaining = queues.reduce((sum, q) => sum + q.length, 0);
    let cursor = 0;
    while (remaining > 0) {
      const projectIndex = cursor % queues.length;
      const image = queues[projectIndex].shift();
      if (image) {
        interleaved.push({
          title: projectPhotos[projectIndex].title,
          location: projectPhotos[projectIndex].location,
          image,
        });
        remaining -= 1;
      }
      cursor += 1;
    }

    return interleaved;
  }, []);

  const galleryRowTop = useMemo(
    () => fieldMoments.filter((_, i) => i % 2 === 0),
    [fieldMoments]
  );
  const galleryRowBottom = useMemo(
    () => fieldMoments.filter((_, i) => i % 2 === 1),
    [fieldMoments]
  );

  // These animate
  const stats: StatConfig[] = useMemo(
    () => [
      { label: "Mission areas", value: 5 },
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

      <main className="overflow-hidden relative z-10">
        {/* HERO */}
        <section className="relative overflow-hidden text-white scroll-fade section-chrome min-h-[92vh]">
          <div className="eu-hero-background" aria-hidden="true">
            <div className="eu-hero-light" />
            <div className="eu-hero-network">
              <img src="/europe-network-map.png" alt="" className="eu-hero-map" fetchPriority="high" />
              <span className="eu-hero-connection" style={{ left: "22.657%", top: "91.935%", width: "23.033%", transform: "rotate(-44.549deg)", animationDelay: "0.0s" }} />
              <span className="eu-hero-connection" style={{ left: "39.071%", top: "72.546%", width: "7.809%", transform: "rotate(-7.477deg)", animationDelay: "-1.3s" }} />
              <span className="eu-hero-connection" style={{ left: "46.814%", top: "71.326%", width: "9.806%", transform: "rotate(-34.892deg)", animationDelay: "-2.6s" }} />
              <span className="eu-hero-connection" style={{ left: "46.814%", top: "71.326%", width: "14.116%", transform: "rotate(61.400deg)", animationDelay: "-3.9000000000000004s" }} />
              <span className="eu-hero-connection" style={{ left: "46.814%", top: "71.326%", width: "16.446%", transform: "rotate(11.767deg)", animationDelay: "-5.2s" }} />
              <span className="eu-hero-connection" style={{ left: "54.857%", top: "64.595%", width: "15.485%", transform: "rotate(-64.479deg)", animationDelay: "-6.5s" }} />
              <span className="eu-hero-city" style={{ left: "22.657%", top: "91.935%", animationDelay: "0.0s" }} />
              <span className="eu-hero-city" style={{ left: "39.071%", top: "72.546%", animationDelay: "-0.8s" }} />
              <span className="eu-hero-city eu-hero-city-home" style={{ left: "46.814%", top: "71.326%", animationDelay: "-1.6s" }} />
              <span className="eu-hero-city" style={{ left: "54.857%", top: "64.595%", animationDelay: "-2.4000000000000004s" }} />
              <span className="eu-hero-city" style={{ left: "53.571%", top: "86.198%", animationDelay: "-3.2s" }} />
              <span className="eu-hero-city" style={{ left: "62.914%", top: "75.351%", animationDelay: "-4.0s" }} />
              <span className="eu-hero-city" style={{ left: "61.529%", top: "47.827%", animationDelay: "-4.800000000000001s" }} />
            </div>

          </div>

          <div className="page-shell relative z-10 pt-20 pb-16 md:pb-24">
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
                    className="border-white/80 text-white bg-white/10 backdrop-blur-sm shadow-sm hover:bg-white/20 hover:border-white"
                  >
                    <Link to="/projects">See projects</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="text-white bg-white/10 border border-white/40 backdrop-blur-sm hover:bg-white/20 hover:border-white/70"
                  >
                    <Link to="/contact">
                      Let’s talk
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
                          New projects are available. Head on to the Projects page for the latest opportunities.
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
                  Five mission areas, one bold youth agenda
                </h2>
              </div>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:translate-x-1 transition-transform"
              >
                Explore our story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile: swipeable snap carousel */}
            <div
              className="flex sm:hidden overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {missionAreas.map((area, index) => (
                <div key={area.title} className="w-[78%] flex-shrink-0 snap-start">
                  <MissionAreaCard area={area} index={index} />
                </div>
              ))}
            </div>

            {/* Tablet/desktop: grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {missionAreas.map((area, index) => (
                <MissionAreaCard key={area.title} area={area} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="pt-6 pb-16 md:pt-8 md:pb-20 bg-muted scroll-fade">
          <div className="page-shell">
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
          </div>

          <div className="postcard-gallery page-shell relative mt-10 space-y-1">
            <div className="postcard-projector" aria-hidden="true">
              <div className="postcard-projector-beam" />
              <div className="postcard-projector-reel postcard-projector-reel-back" />
              <div className="postcard-projector-reel postcard-projector-reel-front" />
              <div className="postcard-projector-body">
                <span className="postcard-projector-label">FIELD NOTES</span>
                <span className="postcard-projector-vents" />
                <span className="postcard-projector-switch" />
              </div>
              <div className="postcard-projector-lens" />
              <div className="postcard-projector-stand" />
              <div className="postcard-projector-foot" />
            </div>
            <div className="marquee-track">
              <div
                className="marquee-row marquee-left gap-6 px-3"
                style={{ "--marquee-duration": "70s" } as CSSProperties}
              >
                {[...galleryRowTop, ...galleryRowTop].map((item, i) => (
                  <FieldMomentTile key={`top-${i}-${item.image}`} item={item} tilt={(i % galleryRowTop.length) % 2 === 0 ? -2 : 2} />
                ))}
              </div>
            </div>
            <div className="marquee-track">
              <div
                className="marquee-row marquee-right gap-6 px-3"
                style={{ "--marquee-duration": "62s" } as CSSProperties}
              >
                {[...galleryRowBottom, ...galleryRowBottom].map((item, i) => (
                  <FieldMomentTile key={`bottom-${i}-${item.image}`} item={item} tilt={(i % galleryRowBottom.length) % 2 === 0 ? 2 : -2} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PROGRAMS */}
        <section className="py-8 md:py-10 relative scroll-fade">
          <div className="page-shell">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border bg-background px-5 py-4 shadow-soft hover-lift">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <p className="text-sm md:text-base text-foreground">
                  <span className="font-semibold">New Erasmus+ projects are open</span>
                  <span className="text-muted-foreground"> — zero participation fees, check dates & infopacks.</span>
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/projects" className="inline-flex items-center">
                  Go to Projects
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
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

    </div>
  );
};

export default Homepage;
