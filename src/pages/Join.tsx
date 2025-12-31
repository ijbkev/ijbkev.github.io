import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, Lightbulb, ArrowRight, UserPlus, Mail, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
const Join = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.25),transparent_35%)]" />
        <div className="page-shell relative py-16 md:py-20 text-center space-y-6">
          <Badge className="mx-auto bg-white/15 text-white border-white/20 w-fit">Co-create with us</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold">Partnerships that move youth forward</h1>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            Join Erasmus+ projects, fund youth travel cohorts, or host sustainability experiences — we will design the journey together.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:-translate-y-0.5 transition-transform">
              <Link to="/contact">
                <Mail className="mr-2 h-5 w-5" />
                Contact us
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/60 text-white bg-transparent hover:bg-white/10"
            >
              <Link to="/projects">See open programs</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell space-y-12">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Partnership opportunities</p>
          <h2 className="text-3xl md:text-4xl font-semibold">Bring your expertise, we’ll bring the facilitation</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We collaborate with organizations, universities, municipalities, and startups on Erasmus+, DiscoverEU, and sustainability projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Users className="w-7 h-7" />, title: "Organizations", text: "Deliver Erasmus+ projects with robust safeguarding and reporting." },
            { icon: <Globe className="w-7 h-7" />, title: "International partners", text: "Host or exchange cohorts to deepen cultural and academic ties." },
            { icon: <Lightbulb className="w-7 h-7" />, title: "Innovation teams", text: "Prototype digital solutions and sustainability pilots together." },
          ].map((item) => (
            <Card key={item.title} className="panel-strong text-center">
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

        <Card className="panel-strong max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.18em]">Partner pack</span>
            </div>
            <h3 className="text-2xl font-semibold text-foreground">Partnership Identification Form (PIF)</h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Download our PIF to review our experience, roles, and how we align with your application or consortium.
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
