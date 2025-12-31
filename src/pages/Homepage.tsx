import { useEffect, useState } from "react";
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
import heroImage from "@/assets/hero-background.jpg";
import euFundingLogo from "@/assets/eu-funding-logo.png";

const Homepage = () => {
  const missionAreas = [
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: "Digital Skills & AI",
      description: "Immersive training, ethical AI literacy, and hands-on tech for future-ready youth.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Social Entrepreneurship",
      description: "Building ventures that tackle real community challenges with measurable impact.",
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Intercultural Learning",
      description: "Erasmus+ exchanges that spark cultural fluency, co-creation, and lifelong networks.",
    },
    {
      icon: <Leaf className="w-7 h-7" />,
      title: "Sustainability",
      description: "Outdoor learning, climate literacy, and daily habits that protect our planet.",
    },
  ];

  const initiatives = [
    {
      title: "DiscoverEU: 3 group routes",
      summary:
        "Fully funded Interrail journeys with daily support, curated learning stops, and leaders on every route.",
      cta: "Join the travel cohort",
      href: "https://forms.gle/PLDCB35wsTjaHPoP7",
    },
    {
      title: "AI 4 Social Impact",
      summary:
        "Tallinn, Estonia — co-designing ethical AI concepts with peers from Lithuania, Germany, and Poland.",
      cta: "See the story",
      link: "/blog",
    },
    {
      title: "Act it Out!",
      summary: "Forum theatre in Debrecen, Hungary — using performance to unlock dialogue and inclusion.",
      cta: "Explore the program",
      link: "/projects",
    },
  ];

  const gallery = [
    { title: "Be a Leader", location: "Targoviste, Romania", image: "/lovable-uploads/49b61ef9-3596-4028-bfde-d476a7bea249.png" },
    { title: "Act it Out!", location: "Debrecen, Hungary", image: "/lovable-uploads/c4c1f046-ccc5-4e93-852a-0da78fda170b.png" },
    { title: "AI Tools 4 Youth Work", location: "North Macedonia", image: "/lovable-uploads/14025e70-2537-4558-9ecb-3bde034b333f.png" },
    { title: "Digitalization Matters", location: "Germany", image: "/lovable-uploads/94060860-f177-45f6-8e5f-4455f97eb693.png" },
  ];

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroOffset = Math.min(scrollY, 320);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="overflow-hidden">
        <section className="relative isolate">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: `translateY(${heroOffset * 0.06}px)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950/70 to-slate-950" />
          <div
            className="absolute inset-0 mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(96,165,250,0.3), transparent 35%), radial-gradient(circle at 80% 10%, rgba(234,179,8,0.25), transparent 30%)",
              transform: `translateY(${heroOffset * -0.04}px)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 50% -10%, rgba(255,255,255,0.12), transparent 35%)",
              opacity: 1 - heroOffset / 500,
            }}
          />

          <div className="page-shell relative pt-20 pb-16 md:pb-24">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
              <div
                className="text-white space-y-8 transition-transform"
                style={{
                  transform: `translateY(${heroOffset * -0.05}px) scale(${1 + heroOffset * 0.0002})`,
                  opacity: 1 - heroOffset / 900,
                }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm font-semibold">
                  Erasmus+ powered NGO <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-white/70 mb-3">Kaiserslautern • Europe</p>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight max-w-3xl">
                    Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.
                  </h1>
                  <p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl">
                    We design high-energy learning journeys where youth, technology, and sustainability meet — co-funded by the European Union.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-white text-slate-900 hover:-translate-y-0.5 transition-transform">
                    <Link to="/about">
                      Learn about IJBK
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link to="/projects">See projects</Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
                    <Link to="/join">
                      Partner with us
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Founded", value: "2025" },
                    { label: "Mission areas", value: "4" },
                    { label: "Countries reached", value: "15+" },
                    { label: "Non-profit", value: "100%" },
                  ].map((stat) => (
                    <div key={stat.label} className="glass rounded-2xl border-white/15 px-4 py-3 text-center">
                      <p className="text-2xl font-semibold text-white">{stat.value}</p>
                      <p className="text-xs text-white/70">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel bg-white/90 backdrop-blur-lg border-white/40 shadow-strong">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="chip bg-primary/10 text-primary">What we do</span>
                    <span className="text-sm text-muted-foreground">Impact-first, youth-led</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Calendar className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Right now</p>
                        <h3 className="text-xl font-semibold text-foreground">Recruiting DiscoverEU cohorts</h3>
                        <p className="text-muted-foreground">3 guided Interrail routes starting April 2026 with full travel, food, and stay support.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Sparkles className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-semibold text-foreground">EU-backed quality</h4>
                        <p className="text-muted-foreground">Program design aligned with Erasmus+ standards, inclusive selection, and intercultural safety practices.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <img src="/lovable-uploads/1c6cd6cd-95e8-4227-84d0-246ca492d9a8.png" alt="Erasmus+ Programme" className="h-14 w-full object-contain" />
                    <img src={euFundingLogo} alt="EU funding" className="h-14 w-full object-contain" />
                  </div>
                </CardContent>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-gradient-subtle relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "var(--gradient-radial)" }} />
          <div className="page-shell relative space-y-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">What matters to us</p>
                <h2 className="text-3xl md:text-4xl font-semibold leading-tight mt-2">Four mission areas, one bold youth agenda</h2>
              </div>
              <Link to="/about" className="inline-flex items-center gap-2 text-primary font-semibold hover:translate-x-1 transition-transform">
                Explore our story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {missionAreas.map((area) => (
                <Card key={area.title} className="panel-strong group h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition-transform">
                      {area.icon}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">{area.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                    </div>
                    <div className="h-1 rounded-full bg-gradient-hero opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="page-shell space-y-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Live & upcoming</p>
                <h2 className="text-3xl md:text-4xl font-semibold leading-tight">Programs with seats, stories, and results</h2>
              </div>
              <Button asChild>
                <Link to="/projects">
                  View all projects
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <Card className="bg-gradient-hero text-white shadow-strong border-none">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="chip bg-white/15 text-white">DiscoverEU</span>
                    <span className="text-sm text-white/80">Travel across Europe, train-first</span>
                  </div>
                  <h3 className="text-2xl font-semibold">Fully funded routes across Europe with daily support</h3>
                  <p className="text-white/85 leading-relaxed">
                    Three travel groups, each with leaders, Interrail passes, hostel nights, food stipends, and local transport covered. No participation fee — just curiosity and commitment.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="glass rounded-xl border-white/20 p-4">
                      <p className="text-3xl font-semibold text-white">15</p>
                      <p className="text-sm text-white/70">Young travelers per route</p>
                    </div>
                    <div className="glass rounded-xl border-white/20 p-4">
                      <p className="text-3xl font-semibold text-white">Start: Apr 2026</p>
                      <p className="text-sm text-white/70">Rolling acceptance</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://forms.gle/PLDCB35wsTjaHPoP7"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 px-4 py-2 font-semibold hover:-translate-y-0.5 transition-transform"
                    >
                      Apply now
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                    <Link
                      to="/join"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2 text-white hover:bg-white/10 transition-colors"
                    >
                      Partner with us
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {initiatives.map((item) => (
                  <Card key={item.title} className="panel hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-lg font-semibold text-foreground">{item.title}</h4>
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <p className="text-muted-foreground">{item.summary}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary/80"
                        >
                          {item.cta}
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      ) : (
                        <Link to={item.link!} className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary/80">
                          {item.cta}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted">
          <div className="page-shell space-y-10">
            <div className="text-center space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Field moments</p>
              <h2 className="text-3xl md:text-4xl font-semibold">Snapshots from our journeys</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Youth exchanges, training courses, and cultural immersions across Europe — captured in motion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {gallery.map((item) => (
                <Card key={item.title} className="overflow-hidden group shadow-medium hover:shadow-strong transition-shadow duration-300">
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
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-background">
          <div className="page-shell space-y-10">
            <div className="text-center space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Trust & recognition</p>
              <h2 className="text-3xl md:text-4xl font-semibold">Co-funded by the European Union</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Every initiative follows Erasmus+ quality standards, with inclusive selection, intercultural facilitation, and safety at the core.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="panel text-center">
                <CardContent className="p-8 space-y-4">
                  <img
                    src="/lovable-uploads/1c6cd6cd-95e8-4227-84d0-246ca492d9a8.png"
                    alt="Erasmus+ Programme"
                    className="h-16 w-auto object-contain mx-auto"
                  />
                  <p className="text-muted-foreground">Proud participants in Erasmus+ programmes empowering European youth.</p>
                </CardContent>
              </Card>
              <Card className="panel text-center">
                <CardContent className="p-8 space-y-4">
                  <img
                    src="/lovable-uploads/10b5b39b-baa5-4822-aa8c-25a360e74a7a.png"
                    alt="Co-funded by the European Union"
                    className="h-16 w-auto object-contain mx-auto"
                  />
                  <p className="text-muted-foreground">Projects supported through EU funding programmes with transparent impact tracking.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Homepage;
