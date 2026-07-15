import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Target, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground relative">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.25),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_32%)]" />
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
              <div key={stat.label} className="bg-white/15 backdrop-blur-lg rounded-2xl border border-white/30 p-5 text-left">
                <p className="text-xs uppercase tracking-[0.15em] text-white/80 font-semibold">{stat.label}</p>
                <p className="text-base font-semibold text-white mt-2">{stat.value}</p>
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
              <Badge className="bg-white/20 text-white border-white/40">Erasmus+ certified partner</Badge>
              <Badge className="bg-white/20 text-white border-white/40">Inclusive selection</Badge>
            </div>
          </div>
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="text-blue-600" />
                <h3 className="text-xl font-semibold text-foreground">What this means in practice</h3>
              </div>
              <ul className="space-y-3 text-foreground">
                <li>• Transparent recruitment and safeguarding aligned with EU standards.</li>
                <li>• Learning experiences co-designed with youth for relevance and belonging.</li>
                <li>• Agile teams that balance academic rigor with creative facilitation.</li>
                <li>• Reporting that tracks impact, inclusion, and sustainability outcomes.</li>
              </ul>
              <Link to="/projects" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700">
                See our track record <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 scroll-fade section-chrome">
        <div className="page-shell space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Financial accessibility first</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Our motto</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Access to international learning should never depend on the ability to pay. Too often, young people face participation fees for Erasmus+ projects — even when these projects claim to be inclusive. We have seen fees as high as €120 become a barrier for talented participants, turning opportunity into privilege.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed font-semibold">
              We ask a simple question: how many capable and deserving young people are excluded because they cannot afford to pay? Having experienced this firsthand, we founded IJBK e.V. to build Erasmus+ opportunities that are truly accessible, inclusive, and free of financial barriers. Erasmus+ should remain what it was meant to be — learning, connection, and growth — not a privilege limited by cost.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "€0", label: "Participation fees" },
              { icon: "🎓", label: "Scholarships over paywalls" },
              { icon: "🌍", label: "Inclusive recruitment" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{item.icon}</div>
                <p className="font-semibold text-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted scroll-fade section-chrome">
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
              <Card key={area.title} className="panel-strong holo-card hover-lift transition-transform">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">{area.title}</h3>
                  <p className="text-muted-foreground">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 scroll-fade section-chrome">
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
            <Card className="panel-strong holo-card hover-lift">
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

    </div>
  );
};

export default About;
