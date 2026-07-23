import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ExternalLink, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type Project = {
  id: string;
  title: string;
  category: string;
  status: string;
  statusTone: string;
  date: string;
  location: string;
  description: string;
  highlights: string[];
  coverImage: string;
  coverAlt: string;
  applicationLink?: string;
  applicationLabel?: string;
};

const Projects = () => {
  const projects: Project[] = [
    {
      id: "oasis",
      title: "🌴 OASIS",
      category: "Erasmus+ Youth Exchange",
      status: "Upcoming",
      statusTone: "warning",
      date: "31 October–8 November 2026",
      location: "Hammamet, Tunisia",
      description:
        "Youth exchange exploring online safety, scams, misinformation, manipulation techniques, verification tools, digital resilience, and responsible online behaviour.",
      highlights: ["Online safety & scams", "Digital resilience", "Anti-Scam Escape Room", "5 partner countries", "NO participation fees"],
      applicationLink: "https://canva.link/ijbk-oasis",
      applicationLabel: "View infopack",
      coverImage: "https://flagcdn.com/w640/tn.png",
      coverAlt: "Tunisian flag",
    },
    {
      id: "who-am-ai",
      title: "WHO AM AI?",
      category: "Erasmus+ Youth Exchange",
      status: "Upcoming",
      statusTone: "warning",
      date: "2–10 October 2026",
      location: "Austria",
      description:
        "Exploring artificial intelligence, critical thinking, and digital responsibility together through a youth exchange focused on reflection and co-creation.",
      highlights: ["AI literacy", "Critical thinking", "Digital responsibility", "5 partner countries"],
      applicationLink: "https://canva.link/whoamai",
      applicationLabel: "View infopack",
      coverImage: "https://flagcdn.com/w640/at.png",
      coverAlt: "Austrian flag",
    },
    {
      id: "connected-not-consumed",
      title: "Connected, Not Consumed",
      category: "Erasmus+ Youth Exchange",
      status: "Upcoming",
      statusTone: "warning",
      date: "1–10 December 2026",
      location: "Germany",
      description:
        "Exploring digital well-being, media literacy, and conscious online participation together across Europe.",
      highlights: ["Digital well-being", "Media literacy", "Online participation", "7 partner countries"],
      applicationLink: "https://canva.link/ijbk-cnc",
      applicationLabel: "View infopack",
      coverImage: "https://flagcdn.com/w640/de.png",
      coverAlt: "German flag",
    },
    {
      id: "green-stage-sustainable-future",
      title: "Green Stage for Sustainable Future",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "22–31 May 2026",
      location: "Norway",
      description:
        "Climate action meets theatre: sustainability, creativity, and nature-based learning with a public showcase.",
      highlights: ["Theatre & storytelling", "Sustainability workshops", "Hikes + eco-farm visit"],
      coverImage: "https://flagcdn.com/w640/no.png",
      coverAlt: "Norwegian flag",
    },
    {
      id: "discover-eu",
      title: "Fully funded travel across Europe with DiscoverEU",
      category: "EU Travel Initiative",
      status: "Completed",
      statusTone: "success",
      date: "1 April 2026",
      location: "Europe",
      description:
        "DiscoverEU opens Europe by train. Three curated routes with leaders, Interrail passes, accommodation, food, and local transport fully covered — no participation fee.",
      highlights: ["FREE Interrail Pass", "Daily pocket money", "Cultural exchange stops", "Leaders per route"],
      applicationLink: "https://ijbkev.github.io",
      applicationLabel: "View the project results",
      coverImage: "https://flagcdn.com/w640/eu.png",
      coverAlt: "European Union flag",
    },
    {
      id: "ai-social-impact",
      title: "AI 4 Social Impact",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "5 – 12 December 2025",
      location: "Tallinn, Estonia",
      description:
        "A co-creative exchange on ethical AI, prototyping solutions for social challenges while building cross-country friendships.",
      highlights: ["Ethical AI labs", "Solution design", "Cross-country teams", "Showcase day"],
      coverImage: "https://flagcdn.com/w640/ee.png",
      coverAlt: "Estonian flag",
    },
    {
      id: "KA152",
      title: "KA152: Digitalisation Matters",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "2024",
      location: "Germany",
      description:
        "A digital literacy sprint covering AI tools, online safety, and collaboration to strengthen European youth skills.",
      highlights: ["Digital skills workshops", "AI tools training", "Cross-cultural teams", "Project-based learning"],
      coverImage: "https://flagcdn.com/w640/de.png",
      coverAlt: "German flag",
    },
    {
      id: "KA153",
      title: "KA153: AI Tools 4 Youth Work",
      category: "Erasmus+ Training Course",
      status: "Completed",
      statusTone: "success",
      date: "2024",
      location: "North Macedonia",
      description:
        "Upskilling youth workers with practical AI ethics, toolkits, and facilitation techniques for local programs.",
      highlights: ["AI ethics", "Practical toolkits", "Youth worker capacity building", "Open resources"],
      coverImage: "https://flagcdn.com/w640/mk.png",
      coverAlt: "North Macedonian flag",
    },
    {
      id: "ai-culinary",
      title: "AI & Culinary Journey in Türkiye",
      category: "Cultural Exchange",
      status: "Completed",
      statusTone: "success",
      date: "2025",
      location: "Türkiye",
      description:
        "Combining culinary arts with AI in the food industry — exploring culture through kitchens and code.",
      highlights: ["Cultural immersion", "AI in food", "Traditional cooking", "Tech integration"],
      coverImage: "https://flagcdn.com/w640/tr.png",
      coverAlt: "Turkish flag",
    },
    {
      id: "hiking-tours",
      title: "Sustainability Hiking Tours",
      category: "Environmental Initiative",
      status: "Ongoing",
      statusTone: "info",
      date: "2025",
      location: "Kaiserslautern Region",
      description:
        "Sustainability-focused hikes mixing outdoor activity, environmental education, and community building.",
      highlights: ["Environmental education", "Sustainable tourism", "Local partnerships", "Outdoor learning"],
      coverImage: "https://flagcdn.com/w640/de.png",
      coverAlt: "German flag",
    },
  ];

  const statusStyles: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-blue-100 text-blue-800",
  };

  const statusTabs = ["Upcoming", "Completed", "Ongoing"] as const;
  const [activeStatus, setActiveStatus] = useState<(typeof statusTabs)[number]>("Upcoming");

  const projectCounts = useMemo(
    () =>
      statusTabs.reduce<Record<string, number>>((acc, status) => {
        acc[status] = projects.filter((project) => project.status === status).length;
        return acc;
      }, {}),
    [projects],
  );

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.status === activeStatus),
    [projects, activeStatus],
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="panel-strong h-full overflow-hidden holo-card hover-lift flex flex-col"
            >
              <div className="relative h-40 sm:h-44 shrink-0">
                <img
                  src={project.coverImage}
                  alt={project.coverAlt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-blue-950/70 to-cyan-950/25" />
                <div className="absolute inset-0 bg-black/18" />
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3 text-white z-10">
                  <div className="space-y-1 min-w-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/85">{project.location}</p>
                    <h3 className="text-lg font-semibold leading-tight line-clamp-2 text-white">{project.title}</h3>
                  </div>
                  <Badge
                    className={`rounded-full border-0 px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-sm text-white ${statusStyles[project.statusTone] ?? "bg-slate-100 text-slate-800"}`}
                  >
                    {project.status}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-primary border-primary">
                    {project.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={15} className="shrink-0 text-primary" />
                  <span className="text-foreground">{project.date}</span>
                </div>

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

                {project.applicationLink && (
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
          ))}
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