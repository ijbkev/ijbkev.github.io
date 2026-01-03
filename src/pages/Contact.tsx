import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, Sparkles, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
const Contact = () => {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white scroll-fade section-chrome">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.2),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.16),transparent_34%)]" />
        <div className="page-shell relative py-16 md:py-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            Let's plan your next Erasmus+ journey
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">Contact IJBK e.V.</h1>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            We respond within two business days. Share your idea, partnership request, or youth inquiry.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell scroll-fade section-chrome">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: <MapPin className="w-6 h-6 text-white" />,
              title: "Where to find us",
              hint: "Office address",
              body: (
                <p className="text-muted-foreground">
                  Gerhart-Hauptmann-Str. 24, 216A
                  <br />
                  67663 Kaiserslautern, Germany
                </p>
              ),
            },
            {
              icon: <Mail className="w-6 h-6 text-white" />,
              title: "Email",
              hint: "Send us a message",
              body: (
                <a href="mailto:office@ijbk-de.org" className="text-primary font-semibold hover:text-primary/80">
                  office@ijbk-de.org
                </a>
              ),
            },
            {
              icon: <Clock className="w-6 h-6 text-white" />,
              title: "Office hours",
              hint: "When we’re available",
              body: (
                <p className="text-muted-foreground">
                  Monday - Friday
                  <br />
                  11:00 AM - 4:00 PM (CET)
                </p>
              ),
            },
            {
              icon: <Phone className="w-6 h-6 text-white" />,
              title: "WhatsApp",
              hint: "Call or message us",
              body: (
                <a
                  href="https://wa.me/4915253482040"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold hover:text-primary/80"
                >
                  +49 152 53482040
                </a>
              ),
            },
          ].map((item) => (
            <Card key={item.title} className="panel-strong holo-card hover-lift transition-transform duration-300">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-hero grid place-items-center shadow-soft">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.hint}</p>
                  </div>
                </div>
                <div>{item.body}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/join" className="inline-flex items-center gap-2 text-primary font-semibold">
            See partnership options
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};
export default Contact;
