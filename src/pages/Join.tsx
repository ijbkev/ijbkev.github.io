import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Globe, Lightbulb, ArrowRight, UserPlus, Sparkles } from "lucide-react";

const Join = () => {
  const opportunities = [
    {
      icon: <Users className="w-7 h-7" />,
      title: "Organizations",
      text: "Deliver Erasmus+ projects with robust safeguarding and reporting.",
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "International partners",
      text: "Host or exchange cohorts to deepen cultural and academic ties.",
    },
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: "Innovation teams",
      text: "Prototype digital solutions and sustainability pilots together.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white scroll-fade section-chrome">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.2),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.16),transparent_34%)]" />

        <div className="page-shell relative py-16 md:py-20 text-center space-y-6">
          <Badge className="mx-auto bg-white/15 text-white border-white/20 w-fit">
            Co-create with us
          </Badge>

          {/* moved here */}
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">
            Partnership opportunities
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold">
            Partnerships that move youth forward
          </h1>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            We collaborate with organizations, universities, municipalities, and startups on Erasmus+,
            DiscoverEU, and sustainability projects.
          </p>

          <div className="flex justify-center gap-4" />
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell space-y-12 scroll-fade section-chrome">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {opportunities.map((item) => (
            <Card key={item.title} className="panel-strong text-center holo-card hover-lift">
              <CardContent className="p-6 space-y-3">
                <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary grid place-items-center mx-auto">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="panel-strong max-w-4xl mx-auto holo-card hover-lift">
          <CardContent className="p-8 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.18em]">Partner pack</span>
            </div>

            <h3 className="text-2xl font-semibold text-foreground">
              Partnership Identification Form (PIF)
            </h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Download our PIF to review our experience, roles, and how we align with your application
              or consortium.
            </p>

            <a
              href="https://drive.google.com/file/d/1rLm0rNJaEvnCWRtcNXElIktl0NKYhZZA/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="font-semibold">
                <UserPlus className="mr-2 h-5 w-5" />
                View the PIF
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  );
};

export default Join;
