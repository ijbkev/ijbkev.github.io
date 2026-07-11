import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Send,
  FileText,
} from "lucide-react";

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Congo-Brazzaville)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const Contact = () => {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("sent") === "1";

  const successUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/contact?sent=1";
    }

    return `${window.location.origin}/contact?sent=1`;
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.25),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_32%)]" />
        <div className="page-shell relative py-16 md:py-20 grid gap-8 xl:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-6 text-center xl:text-left">
            <div className="xl:hidden">
              <a
                href="https://docs.google.com/document/d/1Cv544_mi0AVQsFhjGvPIrFd1nGeRkaHs/edit?usp=sharing&ouid=111431115553739998032&rtpof=true&sd=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-left shadow-lg backdrop-blur-md"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  Start with our PIF
                </span>
                <ArrowRight className="w-4 h-4 flex-shrink-0 text-white/90" />
              </a>
            </div>

            <Badge className="mx-auto xl:mx-0 bg-white/15 text-white border-white/20 w-fit">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Contact IJBK e.V.
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold max-w-3xl mx-auto xl:mx-0">
              Let's talk from one place.
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto xl:mx-0">
              Send a project request, team application, or general message. We review every submission and reply
              by email.
            </p>

            <div className="hidden xl:block max-w-2xl mx-auto xl:mx-0">
              <a
                href="https://docs.google.com/document/d/1Cv544_mi0AVQsFhjGvPIrFd1nGeRkaHs/edit?usp=sharing&ouid=111431115553739998032&rtpof=true&sd=true"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Start with our PIF (Partner Identification Form)
              </a>
            </div>
          </div>

          <Card className="panel-strong holo-card border-white/20 shadow-2xl bg-white/95 text-slate-900">
            <CardContent className="p-6 md:p-8 space-y-5">
              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Message sent</p>
                    <p className="text-sm text-emerald-800">
                      Your message has been sent to us.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Contact form</h2>
                  <p className="text-sm text-slate-600">Send one clear message. We’ll take it from there.</p>
                </div>
              </div>

              <form action="https://formsubmit.co/office@ijbk-de.org" method="POST" className="space-y-5">
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_subject" value="New contact submission from ijbk-de.org" />
                <input type="hidden" name="_next" value={successUrl} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2 block">
                    <span className="text-sm font-semibold text-slate-700">Full name *</span>
                    <Input name="name" required placeholder="Your full name" />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-sm font-semibold text-slate-700">Email *</span>
                    <Input name="email" type="email" required placeholder="you@example.com" />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-sm font-semibold text-slate-700">Organisation / group *</span>
                    <Input name="organisation" required placeholder="School, NGO, university, company" />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-sm font-semibold text-slate-700">Country *</span>
                    <select
                      name="country"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select your country
                      </option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2 block">
                    <span className="text-sm font-semibold text-slate-700">What are you looking for? *</span>
                    <select
                      name="topic"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select an option
                      </option>
                      <option>Partner for Erasmus+ project</option>
                      <option>Join an upcoming mobility</option>
                      <option>Join our team</option>
                      <option>Collaborations</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="text-sm font-semibold text-slate-700">Your message *</span>
                  <Textarea
                    name="message"
                    required
                    className="min-h-[180px]"
                    placeholder="Tell us what you want to organise, who should be involved, and any important details we should know."
                  />
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span>
                    I agree that IJBK e.V. may contact me about this request using the details I provide.
                  </span>
                </label>

                <Button type="submit" className="w-full sm:w-auto font-semibold shadow-soft hover:shadow-strong">
                  Send
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
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
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
