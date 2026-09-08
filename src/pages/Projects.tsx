import MapHeroAccent from "@/components/MapHeroAccent";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ExternalLink, Sparkles, ArrowRight, ShieldCheck, Fingerprint, Smartphone, Leaf, TrainFront, HeartHandshake, Laptop, BrainCircuit, Utensils, Mountain } from "lucide-react";
import { Link } from "react-router-dom";

import { acceptsReimbursements, projects } from "@/data/projects";

const projectArtwork = {
  oasis: { icon: ShieldCheck, base: "#082638", accent: "#67e8f9", glow: "#155e75", label: "Online safety", pattern: "network" },
  "who-am-ai": { icon: Fingerprint, base: "#201c43", accent: "#c4b5fd", glow: "#4c1d95", label: "Identity & AI", pattern: "grid" },
  "connected-not-consumed": { icon: Smartphone, base: "#10294b", accent: "#93c5fd", glow: "#1e40af", label: "Digital balance", pattern: "rings" },
  "green-stage-sustainable-future": { icon: Leaf, base: "#102d32", accent: "#6ee7b7", glow: "#065f46", label: "Creativity & climate", pattern: "rings" },
  "discover-eu": { icon: TrainFront, base: "#282a3a", accent: "#fcd34d", glow: "#854d0e", label: "Europe by rail", pattern: "network" },
  "ai-social-impact": { icon: HeartHandshake, base: "#2d1d39", accent: "#fda4af", glow: "#881337", label: "AI for good", pattern: "network" },
  KA152: { icon: Laptop, base: "#102b40", accent: "#67e8f9", glow: "#155e75", label: "Digital skills", pattern: "grid" },
  KA153: { icon: BrainCircuit, base: "#241e42", accent: "#c4b5fd", glow: "#4c1d95", label: "Tools for youth work", pattern: "grid" },
  "ai-culinary": { icon: Utensils, base: "#302537", accent: "#fdba74", glow: "#9a3412", label: "Culture & cuisine", pattern: "rings" },
  "hiking-tours": { icon: Mountain, base: "#1c2c38", accent: "#a3e635", glow: "#365314", label: "Explore sustainably", pattern: "network" },
};

const Projects = () => {

  const statusTabs = ["Upcoming", "Ongoing", "Completed"] as const;
  const [activeStatus, setActiveStatus] = useState<(typeof statusTabs)[number]>("Upcoming");

  const projectCounts = statusTabs.reduce<Record<string, number>>((acc, status) => {
        acc[status] = projects.filter((project) => project.status === status).length;
        return acc;
      }, {});

  const filteredProjects = projects.filter((project) => project.status === activeStatus);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <section className="map-page-hero relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
        <MapHeroAccent />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.25),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_32%)]" />
        <div className="page-shell relative py-16 md:py-20 space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-200" />
            <p className="uppercase tracking-[0.2em] text-sm text-amber-100">Projects & achievements</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold max-w-3xl">
            Impactful Erasmus+ programs, from AI exchanges to sustainable adventures.
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl">
            Each project is built with inclusion, safety, and measurable learning outcomes — delivering intercultural
            experiences young people carry forward.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl">
            {[
              { label: "Completed", value: "4" },
              { label: "In motion", value: "3" },
              { label: "Countries engaged", value: "20+" },
              { label: "Youth reached", value: "4000+" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/15 backdrop-blur-lg rounded-2xl border border-white/30 px-5 py-4 text-center">
                <p className="text-3xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="text-xs text-white/80 uppercase tracking-[0.1em] font-semibold mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell space-y-8 scroll-fade section-chrome">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Erasmus+ portfolio</p>
          <h2 className="text-3xl md:text-4xl font-semibold">Featured projects</h2>
        </div>

        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Before you apply</h3>
                <p className="text-muted-foreground leading-relaxed">
                  These are structured educational programmes with learning objectives, daily schedules, and active participation requirements. To understand what an Erasmus+ project truly involves and ensure it aligns with your expectations, please visit our{" "}
                  <Link to="/erasmus-plus" className="text-primary hover:underline font-semibold">
                    What is E+
                  </Link>
                  {" "}section first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeStatus}
          onValueChange={(value) => setActiveStatus(value as (typeof statusTabs)[number])}
        >
          <TabsList>
            {statusTabs.map((status) => (
              <TabsTrigger key={status} value={status}>
                {status}
                <span className="ml-1.5 text-xs text-muted-foreground">({projectCounts[status] ?? 0})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-6">
          {filteredProjects.map((project) => {
            const artwork = projectArtwork[project.id as keyof typeof projectArtwork] ?? projectArtwork.oasis;
            const ArtworkIcon = artwork.icon;
            return (
            <Card
              key={project.id}
              className="panel-strong relative h-full overflow-hidden holo-card hover-lift flex flex-col"
            >
              <div className="relative h-64 shrink-0 overflow-hidden bg-[#061b49] text-white" style={{ background: `radial-gradient(ellipse at 90% 10%, ${artwork.glow}, transparent 75%), ${artwork.base}` }}>
                <div className={`project-cover-pattern project-cover-pattern-${artwork.pattern}`} aria-hidden="true" />
                <div className="absolute right-6 top-7" style={{ color: artwork.accent }} aria-hidden="true">
                  <ArtworkIcon className="w-20 h-20" strokeWidth={1.2} />
                </div>
                <div className="relative p-5 flex items-start justify-between gap-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] font-semibold max-w-[55%]" style={{ color: artwork.accent }}>{artwork.label}</p>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 pt-10" style={{ background: `linear-gradient(to top, ${artwork.base}, ${artwork.base}e6 65%, transparent)` }}>
                  <p className="text-xs text-white/75 mb-2">{project.location}</p>
                  <h3 className="text-lg font-semibold leading-snug">{project.title}</h3>
                  <img src={project.coverImage} alt={project.coverAlt} title={project.location} loading="lazy" className="mt-3 h-6 w-9 object-cover rounded-sm ring-1 ring-white/25 shadow-sm" />
                </div>
              </div>

              <CardContent className="p-6 gap-4 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-primary border-primary">
                    {project.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 shrink-0 text-primary" /><span>{project.date}</span></div>

                <p className="text-muted-foreground leading-relaxed">{project.description}</p>

                <div className="flex flex-wrap gap-2">
                  {project.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>

                {acceptsReimbursements(project) ? (
                  <div className="pt-3 border-t border-border mt-auto">
                    <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 font-semibold after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`View ${project.title}`}>
                      View project <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : project.applicationLink && (
                  <div className="pt-3 border-t border-border mt-auto">
                    <a
                      href={project.applicationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 font-semibold hover:-translate-y-0.5 transition-transform"
                    >
                      {project.applicationLabel ?? "Apply now"}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted scroll-fade section-chrome">
        <div className="page-shell space-y-10">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Confidence markers</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Why partners choose IJBK e.V.</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Transparent planning, inclusive recruitment, and facilitation that respects culture and safety.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "EU compliant", value: "100%", detail: "Safeguarding, reporting, and finance aligned to EU rules." },
              { title: "Countries reached", value: "20+", detail: "Trusted partner network across Europe." },
              { title: "Youth impacted", value: "4000+", detail: "Participants empowered through travel and training." },
              { title: "Projects completed", value: "4", detail: "Delivered with measurable learning outcomes." },
            ].map((item) => (
              <Card key={item.title} className="panel text-center holo-card hover-lift">
                <CardContent className="p-6 space-y-3">
                  <p className="text-3xl font-semibold text-primary">{item.value}</p>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center">
            <ButtonLink to="/contact" />
          </div>
        </div>
      </section>

    </div>
  );
};

const ButtonLink = ({ to }: { to: string }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold hover:-translate-y-0.5 transition-transform"
  >
    Let’s collaborate
    <ArrowRight className="w-4 h-4" />
  </Link>
);

export default Projects;
