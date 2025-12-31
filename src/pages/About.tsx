import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Target, Sparkles, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const About = () => {
  const missionAreas = [
    {
      title: "Digital Skills & AI",
      description:
        "Comprehensive digital literacy, AI ethics, and hands-on prototyping sessions that unlock employability and confidence.",
    },
    {
      title: "Social Entrepreneurship",
      description: "Incubating youth-led solutions with measurable impact, mentoring, and investor-ready storytelling.",
    },
    {
      title: "Intercultural Learning",
      description:
        "Immersive Erasmus+ exchanges that weave together languages, food, art, and collaborative project delivery.",
    },
    {
      title: "Sustainability",
      description: "From climate literacy to low-waste events and outdoor learning labs across Kaiserslautern’s forests.",
    },
  ];

  const values = [
    { title: "Innovation first", text: "Piloting AI, digital tools, and creative facilitation to keep youth learning magnetic." },
    { title: "Radical inclusion", text: "Designing access-first experiences: scholarships, safe spaces, and diverse facilitators." },
    { title: "Sustainability in action", text: "Every trip and workshop considers footprints, local partners, and lasting change." },
    { title: "Co-creation", text: "We build with youth, not for youth — from agenda design to evaluation." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.25),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.25),transparent_30%)]" />
        <div className="page-shell relative py-16 md:py-20 text-center space-y-6">
          <Badge className="mx-auto bg-white/15 text-white border-white/20 w-fit">Registered Non-Profit e.V.</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold">Who we are</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. is a youth-led NGO shaping digital,
            intercultural, and sustainable futures through Erasmus+ collaborations.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Founded", value: "8 July 2025" },
              { label: "Base", value: "Kaiserslautern, Germany" },
              { label: "Legal form", value: "eingetragener Verein" },
              { label: "Partners", value: "Europe-wide" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl border-white/15 p-4 text-left">
                <p className="text-sm uppercase tracking-[0.14em] text-white/70">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell space-y-12">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Our origin story</p>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
              Born from a student network, scaled into a European youth powerhouse.
            </h2>
            <p className="text-lg text-muted-foreground">
              IJBK e.V. evolved from the Studentisches Netzwerk der RPTU to a registered non-profit on 8 July 2025. Today,
              we design experiences where young people from every background learn, travel, and build purposeful projects together.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-primary border-primary">Erasmus+ certified partner</Badge>
              <Badge variant="outline" className="text-primary border-primary">Inclusive selection</Badge>
            </div>
          </div>
          <Card className="panel-strong">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="text-primary" />
                <h3 className="text-xl font-semibold text-foreground">What this means in practice</h3>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li>• Transparent recruitment and safeguarding aligned with EU standards.</li>
                <li>• Learning experiences co-designed with youth for relevance and belonging.</li>
                <li>• Agile teams that balance academic rigor with creative facilitation.</li>
                <li>• Reporting that tracks impact, inclusion, and sustainability outcomes.</li>
              </ul>
              <Link to="/projects" className="inline-flex items-center gap-2 text-primary font-semibold">
                See our track record <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[{ Icon: Calendar, title: "Founded", value: "8 July 2025" },
            { Icon: MapPin, title: "Location", value: "Kaiserslautern, Germany" },
            { Icon: Users, title: "Legal Status", value: "eingetragener Verein (e.V.)" },
            { Icon: Target, title: "Focus", value: "Youth empowerment & intercultural learning" }]
            .map((item) => (
              <Card key={item.title} className="panel">
                <CardContent className="p-5 flex items-start gap-4">
                  <item.Icon className="w-10 h-10 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted">
        <div className="page-shell space-y-10">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Mission areas</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Our focus pillars</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Four interconnected arenas where we combine technology, culture, and sustainability for ambitious youth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {missionAreas.map((area) => (
              <Card key={area.title} className="panel-strong hover:-translate-y-1 transition-transform">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">{area.title}</h3>
                  <p className="text-muted-foreground">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="page-shell space-y-10">
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Vision</p>
              <h2 className="text-3xl md:text-4xl font-semibold">A generation equipped to tackle global challenges.</h2>
              <p className="text-lg text-muted-foreground">
                We bridge traditional education with the realities of the digital age — empowering youth with skills, networks, and
                intercultural fluency to create sustainable change.
              </p>
            </div>
            <Card className="panel-strong">
              <CardContent className="p-6 space-y-4">
                <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">How we behave</p>
                <div className="space-y-4">
                  {values.map((value) => (
                    <div key={value.title} className="flex gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div>
                        <h4 className="font-semibold text-foreground">{value.title}</h4>
                        <p className="text-muted-foreground">{value.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
