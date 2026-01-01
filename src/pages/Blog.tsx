import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, ArrowRight } from "lucide-react";
import actItOutImage from "@/assets/act-it-out.jpg";
import aiSocialImpactImage from "@/assets/ye-social-estonia.jpeg";
import { Link } from "react-router-dom";
import aiSocialImpactVideo from "@/assets/ye-social-estonia.mp4";


const Blog = () => {
  const blogPosts = [
    {
      id: "ai-social-impact",
      title: "AI 4 Social Impact",
      subtitle: "Exploring Ethical AI for Social Change",
      category: "Youth Exchange",
      categoryColor: "bg-blue-100 text-blue-800",
      date: "December 2025",
      location: "Tallinn, Estonia",
      readingTime: "2 min read",
      author: "IJBK Team",
      mediaType: "video",
      mediaSrc: aiSocialImpactVideo,
      poster: aiSocialImpactImage, // optional fallback preview
      featured: true,
      content: [
        "We took part in the Erasmus+ Youth Exchange AI 4 Social Impact in Tallinn, Estonia, from 5th to 12th December 2025. During this inspiring week, young people explored how Artificial Intelligence can be used ethically and responsibly to create positive social change.",
        "Together with participants from different European countries, supported by experienced facilitators and partner organisations, we learned about AI ethics, digital responsibility, and social innovation through non-formal education, hands-on workshops, and teamwork.",
        "Beyond learning, the exchange fostered strong intercultural connections, collaboration, and a shared vision of young people as active changemakers shaping a fairer digital future.",
      ],
      organizers: [
        "Estonian National Youth Council (ENL)",
        "Leap2Peak",
        "Asociacija Tavo Europa",
        "Fundacja Leonarda",
        "Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.",
      ],
      tags: ["AI4SocialImpact", "ErasmusPlus", "YouthExchange", "EthicalAI", "DigitalForGood", "Erasmus"],
    },
    {
      id: "act-it-out",
      title: "Act it Out!",
      subtitle:
        "We took part in an Erasmus+ Training Course in Debrecen, Hungary, from 28th September to 7th October 2025. Over these 10 inspiring days, youth workers explored the creative methods of Image Theatre, Forum Theatre, and Newspaper Theatre, discovering how to use them as powerful tools for driving social change in their communities.",
      category: "Training Course",
      categoryColor: "bg-green-100 text-green-800",
      date: "October 2025",
      location: "Debrecen, Hungary",
      readingTime: "1 min read",
      author: "IJBK Team",
      image: actItOutImage,
      featured: false,
      content: [
        "We took part in an Erasmus+ Training Course in Debrecen, Hungary, from 28th September to 7th October 2025. Over these 10 inspiring days, youth workers explored the creative methods of Image Theatre, Forum Theatre, and Newspaper Theatre, discovering how to use them as powerful tools for driving social change in their communities.",
        "Together with 30 youth workers, supported by 2 trainers and 7 partner organisations, we learned to apply these theatre techniques as performers, facilitators, and changemakers — fostering inclusion and giving voice to vulnerable young people.",
      ],
      organizers: ["@brujulaintercultura", "@eplus_rptu", "@sehzadelerr", "@hellasforus", "@nadejda.crd", "@cehvidit", "@ijbk.ev", "@ascointerasmus", "@hangkepe"],
      tags: ["actitout", "erasmus"],
    },
  ];

  const featuredPost = blogPosts.find((post) => post.featured);
  const regularPosts = blogPosts.filter((post) => !post.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(234,179,8,0.25),transparent_35%)]" />
        <div className="page-shell relative py-16 md:py-20 space-y-6">
          <p className="uppercase tracking-[0.2em] text-sm text-amber-100">Stories & reflections</p>
          <h1 className="text-4xl md:text-5xl font-semibold">Field notes from our Erasmus+ adventures</h1>
          <p className="text-lg text-white/80 max-w-3xl">
            What it looks like when technology, theatre, travel, and intercultural learning meet youth energy.
          </p>
        </div>
      </section>

      <main className="py-16 md:py-20 page-shell space-y-12">
        {featuredPost && (
          <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <article className="relative overflow-hidden rounded-3xl shadow-strong border border-border">
              <div className="absolute inset-0">
              <div className="absolute inset-0">
              {featuredPost.mediaType === "video" ? (
                <video
                  className="w-full h-full object-cover"
                  src={featuredPost.mediaSrc}
                  poster={featuredPost.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={featuredPost.mediaSrc}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-black/20" />
            </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-black/20" />
              </div>
              <div className="relative p-6 sm:p-10 text-white space-y-4 flex flex-col justify-end min-h-[420px]">
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge className="bg-white/20 text-white border-white/30">Featured</Badge>
                  <Badge className={featuredPost.categoryColor}>{featuredPost.category}</Badge>
                </div>
                <h2 className="text-3xl font-semibold">{featuredPost.title}</h2>
                <p className="text-white/85">{featuredPost.subtitle}</p>
                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2"><Calendar size={16} />{featuredPost.date}</span>
                  <span className="inline-flex items-center gap-2"><Clock size={16} />{featuredPost.readingTime}</span>
                  <span className="inline-flex items-center gap-2"><User size={16} />{featuredPost.author}</span>
                  <span className="inline-flex items-center gap-2"><MapPin size={16} />{featuredPost.location}</span>
                </div>
              </div>
            </article>

            <Card className="panel-strong">
              <CardContent className="p-6 space-y-4">
                <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">In this story</p>
                <div className="space-y-3 text-muted-foreground">
                  {featuredPost.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Organizers</p>
                  <div className="flex flex-wrap gap-2">
                    {featuredPost.organizers.map((org) => (
                      <Badge key={org} variant="outline" className="text-xs">{org}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-semibold">More stories</h2>
            <Link to="/projects" className="inline-flex items-center gap-2 text-primary font-semibold">
              View related projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {regularPosts.map((post) => (
              <Card key={post.id} className="panel hover:-translate-y-1 transition-transform duration-300">
                <div className="aspect-video overflow-hidden rounded-t-2xl">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6 space-y-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge className={post.categoryColor}>{post.category}</Badge>
                    <span className="text-sm text-muted-foreground">{post.readingTime}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{post.title}</h3>
                  <p className="text-muted-foreground">{post.subtitle}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Calendar size={16} />{post.date}</span>
                    <span className="inline-flex items-center gap-2"><MapPin size={16} />{post.location}</span>
                    <span className="inline-flex items-center gap-2"><User size={16} />{post.author}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
