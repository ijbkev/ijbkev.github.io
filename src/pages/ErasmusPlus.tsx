import MapHeroAccent from "@/components/MapHeroAccent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, GraduationCap, Train, Target, Calendar, ShieldCheck, BedDouble, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

type ProgramType = {
  icon: ReactNode;
  title: string;
  description: string;
  keyPoints: string[];
};

const ProgramTypeCard = ({ program }: { program: ProgramType }) => (
  <Card className="panel-strong holo-card hover-lift transition-transform h-full flex flex-col">
    <CardContent className="p-6 space-y-4 flex flex-col h-full">
      <div className="flex items-center gap-3">
        {program.icon}
        <h3 className="text-xl font-semibold">{program.title}</h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed min-h-[4.5rem] line-clamp-4">
        {program.description}
      </p>
      <div className="space-y-2">
        <h4 className="font-semibold text-xs uppercase tracking-wide text-primary">
          Key Points
        </h4>
        <ul className="space-y-1.5">
          {program.keyPoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="line-clamp-2">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </CardContent>
  </Card>
);

const ErasmusPlus = () => {
  const programTypes = [
    {
      icon: <Users className="w-8 h-8 text-blue-500" />,
      title: "Youth Exchange",
      description: "Young people from different countries join a themed programme, usually for 5–14 days, combining workshops, teamwork, reflection, and intercultural learning.",
      keyPoints: [
        "Young people from different countries + group leaders",
        "Interactive, practical, peer-learning, not lectures",
        "New skills, confidence, intercultural experience, Youthpass",
        "Flight, accommodation, and meals are usually covered"
      ]
    },
    {
      icon: <GraduationCap className="w-8 h-8 text-purple-500" />,
      title: "Training Course",
      description: "For youth workers, volunteers, and people active in youth organisations. It builds practical skills and methods you can use in your own work.",
      keyPoints: [
        "Usually 18+ (youth workers, NGO members, facilitators, volunteers)",
        "Practical tools, facilitation methods, case studies, and simulations",
        "Stronger competences and tools to use back home",
        "Flight, accommodation, and meals are usually covered"
      ]
    },
    {
      icon: <Train className="w-8 h-8 text-green-500" />,
      title: "DiscoverEU",
      description: "DiscoverEU lets young people explore Europe mainly by train, with a learning purpose focused on cultural discovery, independence, and intercultural understanding.",
      keyPoints: [
        "Learn Europe by experiencing it",
        "Often includes group travel, shared activities, reflection, and learning",
        "Interrail pass, accommodation, and meals are usually covered"
      ]
    },
    {
      icon: <Target className="w-8 h-8 text-orange-500" />,
      title: "European Solidarity Corps (ESC)",
      description: "Young people volunteer or work on solidarity projects across Europe, combining community contribution with personal development.",
      keyPoints: [
        "18–30 years old, flexible duration (2 weeks to 12 months)",
        "Social, environmental, cultural, or community projects",
        "Personal growth, language skills, European citizenship",
        "Accommodation, meals, and pocket money usually provided"
      ]
    }
  ];

  const coveredCosts = [
    {
      icon: <BedDouble className="w-6 h-6 text-blue-500" />,
      label: "Accommodation (usually shared rooms)",
    },
    {
      icon: <UtensilsCrossed className="w-6 h-6 text-amber-500" />,
      label: "Food (typically three meals per day)",
    },
    {
      icon: <GraduationCap className="w-6 h-6 text-purple-500" />,
      label: "Programme costs (trainers, materials, venues)",
    },
    {
      icon: <Train className="w-6 h-6 text-green-500" />,
      label: "Travel reimbursement (according to distance rules and project conditions)",
    },
  ];

  const faqs = [
    {
      question: "Do I need perfect English?",
      answer: "No. Basic communication is enough. These projects are designed for international groups with different language levels."
    },
    {
      question: "Will I have free time?",
      answer: "Yes, usually some. But the programme comes first — participation is not optional."
    },
    {
      question: "What do I get at the end?",
      answer: "You gain skills, international experience, new connections, and usually a Youthpass certificate documenting what you learned."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative">
       {/* Hero Section */}
      <section className="map-page-hero relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
        <MapHeroAccent />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.25),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_32%)]" />
        <div className="page-shell relative py-16 md:py-20 text-center space-y-4">
          <Badge className="mx-auto bg-white/15 text-white border-white/20 w-fit">
            <Globe className="w-4 h-4 mr-2 inline" />
            EU Programme
          </Badge>
          <h1 className="text-4xl md:text-5xl font-semibold">What is Erasmus Plus Programme?</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            Erasmus+ funds cross-border learning through real activities, international teamwork, and practical experiences that help participants build skills and bring ideas back home.
          </p>
        </div>
      </section>

      {/* Programme Types */}
      <section className="py-16 md:py-20 page-shell">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Four formats</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Programme Types</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four common Erasmus+ formats, each with a different audience and learning purpose.
            </p>
          </div>

          {/* Mobile/tablet: swipeable snap carousel */}
          <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {programTypes.map((program, index) => (
              <div key={index} className="w-[80%] sm:w-[45%] flex-shrink-0 snap-start">
                <ProgramTypeCard program={program} />
              </div>
            ))}
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid md:grid-cols-4 gap-6">
            {programTypes.map((program, index) => (
              <ProgramTypeCard key={index} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* Learning Experience, Not Tourism */}
      <section className="py-16 md:py-20 bg-muted scroll-fade section-chrome">
        <div className="page-shell">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl md:text-4xl font-semibold">
                  <span className="text-primary">A learning experience</span> — not tourism
                </h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Erasmus+ projects include cultural activities, but they are structured educational programmes built around clear learning goals, workshops, teamwork, and reflection.
              </p>
            </div>
            <Card className="panel-strong holo-card hover-lift">
              <CardContent className="p-6 space-y-4">
                <h4 className="font-semibold text-foreground">What to expect:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Daily programme with workshops, activities, and reflection</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">You represent your group, organisation, and country</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Respect, safety, inclusion, and active participation are essential</span>
                  </li>
                </ul>
                <div className="bg-background p-5 rounded-lg border-l-4 border-l-primary mt-4">
                  <p className="text-base font-medium text-foreground italic">
                    "Travel is the setting — learning is the purpose."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why EU Funds This */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 scroll-fade section-chrome">
        <div className="page-shell">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Card className="panel-strong holo-card hover-lift order-2 lg:order-1">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">What's usually covered</h3>
                <div className="grid grid-cols-2 gap-3">
                  {coveredCosts.map((cost, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/70"
                    >
                      <span className="[&>svg]:w-5 [&>svg]:h-5 flex-shrink-0">{cost.icon}</span>
                      <span className="text-sm text-muted-foreground leading-snug line-clamp-2">{cost.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4 order-1 lg:order-2">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Investment in people</p>
              <h2 className="text-3xl md:text-4xl font-semibold">Why does the EU fund this?</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The EU invests in people: Erasmus+ supports youth participation, inclusion, and quality learning so participants become more skilled, more open-minded, and better able to work across cultures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 md:py-20 bg-muted scroll-fade section-chrome">
        <div className="page-shell space-y-8">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Common questions</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="panel-strong holo-card hover-lift transition-transform">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 md:py-20 page-shell">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-semibold">Ready to apply?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Erasmus+ is for people who are curious, open-minded, and willing to learn, not just to travel.
            If you want to grow, meet people from across Europe, and do something meaningful, these projects are for you.
          </p>
        </div>
      </section>

    </div>
  );
};

export default ErasmusPlus;
