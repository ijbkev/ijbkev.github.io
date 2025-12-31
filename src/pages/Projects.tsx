import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ExternalLink, Sparkles, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const Projects = () => {
  const projects = [
    {
      id: "discover-eu",
      title: "Fully funded travel across Europe with DiscoverEU",
      category: "EU Travel Initiative",
      status: "Upcoming",
      statusTone: "warning",
      date: "1 April 2026",
      location: "Europe",
      participants: "15",
      description:
        "DiscoverEU opens Europe by train. Three curated routes with leaders, Interrail passes, accommodation, food, and local transport fully covered — no participation fee.",
      highlights: ["FREE Interrail Pass", "Daily pocket money", "Cultural exchange stops", "Leaders per route"],
      applicationLink: "https://forms.gle/PLDCB35wsTjaHPoP7",
    },
    {
      id: "ai-social-impact",
      title: "AI 4 Social Impact",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "5 – 12 December 2025",
      location: "Tallinn, Estonia",
      participants: "Estonia, Lithuania, Germany & Poland",
      description:
        "A co-creative exchange on ethical AI, prototyping solutions for social challenges while building cross-country friendships.",
      highlights: ["Ethical AI labs", "Solution design", "Cross-country teams", "Showcase day"],
    },
    {
      id: "ka152",
      title: "KA152: Digitalisation Matters",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "2024",
      location: "Multiple EU Countries",
      participants: "30+ Young People",
      description:
        "A digital literacy sprint covering AI tools, online safety, and collaboration to strengthen European youth skills.",
      highlights: ["Digital skills workshops", "AI tools training", "Cross-cultural teams", "Project-based learning"],
    },
    {
      id: "ka153",
      title: "KA153: AI Tools 4 Youth Work",
      category: "Erasmus+ Training Course",
      status: "Completed",
      statusTone: "success",
      date: "2024",
      location: "Germany & Partner Countries",
      participants: "25 Youth Workers",
      description:
        "Upskilling youth workers with practical AI ethics, toolkits, and facilitation techniques for local programs.",
      highlights: ["AI ethics", "Practical toolkits", "Youth worker capacity building", "Open resources"],
    },
    {
      id: "ai-culinary",
      title: "AI & Culinary Journey in Türkiye",
      category: "Cultural Exchange",
      status: "Completed",
      statusTone: "success",
      date: "2025",
      location: "Türkiye",
      participants: "20 Participants",
      description:
        "Combining culinary arts with AI in the food industry — exploring culture through kitchens and code.",
      highlights: ["Cultural immersion", "AI in food", "Traditional cooking", "Tech integration"],
    },
    {
      id: "hiking-tours",
      title: "Sustainability Hiking Tours",
      category: "Environmental Initiative",
      status: "Ongoing",
      statusTone: "info",
      date: "2025",
      location: "Kaiserslautern Region",
      participants: "ESN Kaiserslautern Partnership",
      description:
        "Sustainability-focused hikes mixing outdoor activity, environmental education, and community building.",
      highlights: ["Environmental education", "Sustainable tourism", "Local partnerships", "Outdoor learning"],
    },
  ];

  const statusStyles: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.25),transparent_35%)]" />
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
              { label: "In motion", value: "2" },
              { label: "Countries engaged", value: "15+" },
              { label: "Youth reached", value: "4000+" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl border-white/15 p-4">
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Erasmus+ portfolio</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Featured projects</h2>
          </div>
          <Badge variant="outline" className="text-primary border-primary">Quality labelled</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`panel-strong h-full ${project.id === "discover-eu" ? "ring-2 ring-amber-300" : ""}`}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">{project.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-primary border-primary">
                        {project.category}
                      </Badge>
                      <Badge className={statusStyles[project.statusTone]}>{project.status}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-muted-foreground text-sm">
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar size={16} />
                      <span>{project.date}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <MapPin size={16} />
                      <span>{project.location}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Users size={16} />
                      <span>{project.participants}</span>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">{project.description}</p>

                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Highlights</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {project.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {project.applicationLink && (
                  <div className="pt-3 border-t border-border">
                    <a
                      href={project.applicationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 font-semibold hover:-translate-y-0.5 transition-transform"
                    >
                      Apply now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted">
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
              { title: "Countries reached", value: "15+", detail: "Trusted partner network across Europe." },
              { title: "Youth impacted", value: "4000+", detail: "Participants empowered through travel and training." },
              { title: "Projects completed", value: "4", detail: "Delivered with measurable learning outcomes." },
            ].map((item) => (
              <Card key={item.title} className="panel text-center">
                <CardContent className="p-6 space-y-3">
                  <p className="text-3xl font-semibold text-primary">{item.value}</p>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center">
            <ButtonLink to="/join">Partner with us</ButtonLink>
          </div>
        </div>
      </section>

      <Footer />
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
