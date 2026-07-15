import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, GraduationCap, Train, Target, CheckCircle } from "lucide-react";

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
        "Flight, accommodation, and meals are usually covered"
      ]
    },
    {
      icon: <Target className="w-8 h-8 text-orange-500" />,
      title: "European Solidarity Corps (ESC)",
      description: "The European Solidarity Corps gives young people the chance to volunteer or work on solidarity projects across Europe, combining community contribution with personal development and intercultural learning.",
      keyPoints: [
        "18–30 years old, flexible duration (2 weeks to 12 months)",
        "Contribute to real projects: social work, environmental, cultural, or community initiatives",
        "Personal growth, language skills, and European citizenship experience",
        "Accommodation, meals, and pocket money are usually provided"
      ]
    }
  ];

  const coveredCosts = [
    "Accommodation (usually shared rooms)",
    "Food (typically three meals per day)",
    "Programme costs (trainers, materials, venues)",
    "Travel reimbursement (according to distance rules and project conditions)"
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
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
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

          <div className="grid md:grid-cols-4 gap-6">
            {programTypes.map((program, index) => (
              <Card key={index} className="panel-strong holo-card hover-lift transition-transform">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    {program.icon}
                    <h3 className="text-xl font-semibold">{program.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed min-h-[4.5rem]">
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
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
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
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">Daily programme with workshops, activities, and reflection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">You represent your group, organisation, and country</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
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
      <section className="py-16 md:py-20 page-shell scroll-fade section-chrome">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Investment in people</p>
            <h2 className="text-3xl md:text-4xl font-semibold">Why does the EU fund this?</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The EU invests in people: Erasmus+ supports youth participation, inclusion, and quality learning so participants become more skilled, more open-minded, and better able to work across cultures.
            </p>
          </div>
          <Card className="panel-strong holo-card hover-lift">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">What's usually covered</h3>
              <ul className="space-y-2">
                {coveredCosts.map((cost, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">{cost}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic">
                Exact conditions depend on the specific project and your sending organisation.
              </p>
            </CardContent>
          </Card>
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
