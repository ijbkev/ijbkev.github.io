import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import type { SyntheticEvent } from "react";
import viditImage from "@/assets/vidit.jpg";
import omImage from "@/assets/om.png";
import lenochkaImage from "@/assets/lenochka.png";
import babaImage from "@/assets/baba.png";
import prateekImage from "@/assets/prateek.png";
import alexImage from "@/assets/alex.png";
import { Badge } from "@/components/ui/badge";

const Team = () => {
  const teamMembers = [
    {
      name: "Vidit Goyal",
      email: "vidit@ijbk-de.org",
      role: "Legal Representative & Chairman",
      expertise: "Artificial Intelligence & Youth Development",
      country: "India",
      bio: "MSc in Artificial Intelligence (RPTU). Youth worker across Erasmus+ projects with research in time series forecasting and pose estimation.",
      skills: ["AI Research", "Youth Work", "Project Planning", "English Teaching"],
    },
    {
      name: "Rohit Singh Negi",
      email: "rohit@ijbk-de.org",
      role: "Deputy Chairman",
      expertise: "Software Engineering & Project Management",
      country: "India",
      bio: "Software engineer focused on implementation supervision, reimbursements, and precise project planning.",
      skills: ["Software Engineering", "Project Planning", "Implementation", "Finance Tracking"],
    },
    {
      name: "Shivendra Singh",
      email: "shivendra@ijbk-de.org",
      role: "Program Manager",
      expertise: "Erasmus+ Coordination & Safeguarding",
      country: "India",
      bio: "Coordinates mobility logistics, keeps safeguarding standards high, and mentors youth participants before departures.",
      skills: ["Program Coordination", "Safeguarding", "Travel Logistics", "Mentoring"],
    },
    {
      name: "Om Tiwari",
      role: "Founding Member",
      expertise: "Data Science & Social Advocacy",
      country: "India",
      bio: "Data scientist and sustainability advocate leading social media and PR across youth initiatives.",
      skills: ["Data Science", "Sustainability", "Social Justice", "Communications"],
    },
    {
      name: "Alex Conrad",
      email: "alex.conrad@ijbk-de.org",
      role: "Team Member",
      expertise: "Participant Selection",
      country: "Germany",
      bio: "Designs inclusive participant selection, coordinates with partners, and safeguards diverse cohorts.",
      skills: ["Selection", "Application Review", "Partner Coordination", "Program Management"],
    },
    {
      name: "Marta Rudzate",
      email: "marta@ijbk-de.org",
      role: "Founding Member",
      expertise: "Mathematics & Statistics",
      country: "Latvia",
      bio: "Mathematics & Statistics student with ESN volunteering roots, music facilitation, and climate activism.",
      skills: ["Mathematics", "ESN Volunteering", "Meditation", "Climate Advocacy"],
    },
    {
      name: "Tamara Suniarová",
      email: "tamara@ijbk-de.org",
      role: "Founding Member",
      expertise: "Psychology & Youth Work",
      country: "Slovakia",
      bio: "Psychology student supporting Erasmus+ co-creation, refugee aid, sports, mindfulness, and acro yoga.",
      skills: ["Psychology", "Youth Work", "Refugee Support", "Mindfulness"],
    },
    {
      name: "Prateek Kumar Sharma",
      email: "prateek@ijbk-de.org",
      role: "Founding Member",
      expertise: "Computer Science & AI Research",
      country: "India",
      bio: "Computer Science student (RPTU) and DFKI research assistant specializing in AI, ML, NLP, and CV.",
      skills: ["AI", "Machine Learning", "NLP", "Computer Vision", "Research"],
    },
    {
      name: "Yeliena Bemeshchuk",
      email: "yeliena@ijbk-de.org",
      role: "Founding Member",
      expertise: "Logistics Management",
      country: "Ukraine",
      bio: "Leads logistics and resource coordination to keep IJBK initiatives running seamlessly.",
      skills: ["Logistics", "Coordination", "Resource Management", "Operations"],
    },
  ];

  const renderAvatar = (name: string) => {
    const commonProps = {
      className: "w-full h-full object-cover",
      onContextMenu: (e: SyntheticEvent) => e.preventDefault(),
      onDragStart: (e: SyntheticEvent) => e.preventDefault(),
      style: { pointerEvents: "none" as const },
    };
    if (name === "Vidit Goyal") return <img src={viditImage} alt={name} {...commonProps} />;
    if (name === "Om Tiwari") return <img src={omImage} alt={name} {...commonProps} />;
    if (name === "Yeliena Bemeshchuk") return <img src={lenochkaImage} alt={name} {...commonProps} />;
    if (name === "Rohit Singh Negi") return <img src={babaImage} alt={name} {...commonProps} />;
    if (name === "Prateek Kumar Sharma") return <img src={prateekImage} alt={name} {...commonProps} />;
    if (name === "Alex C." || name === "Alex Conrad") return <img src={alexImage} alt={name} {...commonProps} />;
    return (
      <div className="w-full h-full bg-gradient-hero text-white grid place-items-center text-xl font-semibold">
        {name
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.25),transparent_35%)]" />
        <div className="page-shell relative py-16 md:py-20 text-center space-y-5">
          <Badge className="mx-auto bg-white/15 text-white border-white/20 w-fit">The humans behind IJBK</Badge>
          <h1 className="text-4xl md:text-5xl font-semibold">Meet the team</h1>
          <p className="text-lg text-white/80 max-w-3xl mx-auto">
            Strategists, facilitators, and researchers who keep youth journeys safe, inclusive, and unforgettable.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20 page-shell space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <Card key={member.name} className="panel-strong hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-medium flex-shrink-0">
                    {renderAvatar(member.name)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                      <Badge variant="outline" className="text-primary border-primary">{member.country}</Badge>
                    </div>
                    <p className="text-primary font-semibold">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.expertise}</p>
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        {member.email}
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">{member.bio}</p>
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Key skills</p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted">
        <div className="page-shell space-y-8">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">How we collaborate</p>
            <h2 className="text-3xl md:text-4xl font-semibold">What drives our crew</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Shared values that make every Erasmus+ experience safe, inspiring, and high quality.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: "🌍", title: "Global perspective", text: "International experience and cross-cultural empathy." },
              { emoji: "🚀", title: "Innovation focus", text: "Experimenting with tech, theatre, and outdoor learning." },
              { emoji: "🤝", title: "Collaborative spirit", text: "Partners-first planning and co-facilitation." },
              { emoji: "💡", title: "Continuous learning", text: "Iterating on feedback to serve youth better." },
            ].map((item) => (
              <Card key={item.title} className="panel text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="w-14 h-14 bg-gradient-hero rounded-xl grid place-items-center mx-auto text-2xl text-white shadow-soft">
                    {item.emoji}
                  </div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Team;
