import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";


const Blog = () => {
  const blogPosts = [
    {
      id: "discoverEU-memories-2026",
      title: "DiscoverEU Memories Journal 2026 🚆✨",
      subtitle: "From 4 to 23 April 2026, our three DiscoverEU groups travelled across Europe, exploring new cities, cultures, friendships, and unforgettable experiences.",
      category: "EU Travel Initiative",
      categoryColor: "bg-amber-100 text-amber-800",
      date: "April 2026",
      location: "Europe",
      readingTime: "5 min read",
      author: "IJBK Team",
      image: "/lovable-uploads/discoverEU/1000167767.jpg",
      featured: false,
      gallery: [
        "/lovable-uploads/discoverEU/1000167801.jpg",
        "/lovable-uploads/discoverEU/1000167774.jpg",
        "/lovable-uploads/discoverEU/1000167773.jpg",
        "/lovable-uploads/discoverEU/1000167767.jpg",
        "/lovable-uploads/discoverEU/1000167768.jpg",
        "/lovable-uploads/discoverEU/1000167769.jpg",
        "/lovable-uploads/discoverEU/1000167770.jpg",
        "/lovable-uploads/discoverEU/1000167771.jpg",
        "/lovable-uploads/discoverEU/1000167772.jpg",
        "/lovable-uploads/discoverEU/1000167802.jpg",
        "/lovable-uploads/discoverEU/1000167803.jpg",
      ],
      content: [
        "From 4 to 23 April 2026, our three DiscoverEU groups travelled across Europe, exploring new cities, cultures, friendships, and unforgettable experiences.",
        "Over 20 days, the participants and accompanying persons followed different routes through Germany, Czechia, Poland, Slovakia, Hungary, Slovenia, Croatia, and Austria — discovering Europe not only by train, but also through shared moments, challenges, laughter, and reflection.",
        "Each group created its own journey and memories:",
        "Group 1 – Schäfer und die Schafe\nGermany, Czechia, Poland, Slovakia, Hungary",
        "Group 2 – Six Packs on Track\nGermany, Slovenia, Croatia, Hungary, Czechia",
        "Group 3 – Backpackers TBD\nGermany, Poland, Slovakia, Hungary, Austria",
        "The DiscoverEU Memories Journal brings together the reflections, photos, and stories of all three groups — showing what it means to travel, learn, grow, and connect across borders.",
        "A journey of trains, cities, cultures, friendships, and memories that will stay for life. 🌍🚆💙",
        "Find the Memories Journal at www.ijbkev.github.io",
      ],
      organizers: ["IJBK", "DiscoverEU", "European Commission"],
      tags: ["DiscoverEU", "Travel", "Europe", "Youth", "Memories", "EUTravel"],
    },
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
      mediaSrc: "/lovable-uploads/ye-social-estonia.mp4",
      poster: "/lovable-uploads/ye-social-estonia.jpeg",
      featured: true,
      content: [
        "The youth exchange in Tallinn continued with several inspiring and productive days focused on artificial intelligence, creativity, teamwork and social impact.",
        "On the second day, participants explored the foundations of artificial intelligence and discussed how technology can be used responsibly for social good. Through interactive workshops, they learned about the basic principles behind AI systems, reflected on ethical dilemmas, and discussed the role of young people in shaping the digital future. Later, participants formed project teams and joined the Market Research Lab, where they identified real social challenges, explored user needs and started developing their first ideas for meaningful AI-driven solutions.",
        "As the project progressed, participants moved deeper into the creative and practical side of their work through the MVP Building Lab. Teams refined their ideas, strengthened their value propositions, shaped clearer project structures and prepared their prototypes for presentation. During the Go-To-Market Workshop, they explored how their AI solutions could be scaled, shared or launched in real-world contexts, while also discussing target groups, communication strategies and the importance of designing technology that responds to real social needs.",
        "The final day marked the official closing of the youth exchange in Tallinn. After an intense week filled with learning, creativity, teamwork and intercultural experiences, participants gathered for the Final Evaluation Session to reflect on everything they had achieved. They shared key insights, memorable moments and lessons they will take home. Participants also received their Youthpass certificates, marking the completion of their learning journey and recognising the new digital, social and intercultural competences they developed during the exchange.",
        "Although the project has come to an end, the friendships, ideas and connections created in Tallinn will continue far beyond this experience. A big thank you to everyone who took part, contributed, shared, learned and helped make this exchange meaningful and inspiring from beginning to end.",
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
      image: "/lovable-uploads/act-it-out.jpg",
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

  const CarouselView = ({ images }: { images: string[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
    };

    const goToNext = () => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    };

    return (
      <div className="relative w-full h-full">
        <img
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {/* Navigation Buttons */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white p-3 rounded-full transition-all"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white p-3 rounded-full transition-all"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Counter */}
        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-2 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Dots Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/40 w-2 hover:bg-white/60"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const expandedPost = blogPosts.find((post) => post.id === expandedPostId);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Navigation />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.25),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_32%)]" />
        <div className="page-shell relative py-16 md:py-20 space-y-6">
          <p className="uppercase tracking-[0.2em] text-sm text-amber-100">Stories & reflections</p>
          <h1 className="text-4xl md:text-5xl font-semibold">Field notes from our Erasmus+ adventures</h1>
          <p className="text-lg text-white/80 max-w-3xl">
            What it looks like when technology, theatre, travel, and intercultural learning meet youth energy.
          </p>
        </div>
      </section>

      <main className="py-16 md:py-20 page-shell space-y-12">
        <section className="space-y-6 scroll-fade section-chrome">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-semibold">Our stories</h2>
            <Link to="/projects" className="inline-flex items-center gap-2 text-primary font-semibold">
              View related projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {blogPosts.map((post) => (
              <Card key={post.id} className="panel holo-card hover-lift transition-transform duration-300">
                <div className="aspect-video overflow-hidden rounded-t-2xl relative bg-muted">
                  {post.gallery ? (
                    <CarouselView images={post.gallery} />
                  ) : post.mediaType === "video" ? (
                    <video
                      className="w-full h-full object-cover"
                      src={post.mediaSrc}
                      poster={post.poster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge className={post.categoryColor}>{post.category}</Badge>
                    <span className="text-sm text-muted-foreground">{post.readingTime}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{post.title}</h3>
                  <p className="text-muted-foreground">{post.subtitle}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {post.content[0]}
                  </p>
                  <Button 
                    onClick={() => setExpandedPostId(post.id)}
                    variant="outline" 
                    className="w-full mt-2"
                  >
                    Read Full Story
                  </Button>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
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

      {/* Expanded Post Modal */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto panel-strong">
            <div className="sticky top-0 bg-white dark:bg-slate-950 border-b p-6 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">{expandedPost.title}</h2>
              </div>
              <button
                onClick={() => setExpandedPostId(null)}
                className="shrink-0 p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
            
            <CardContent className="p-6 space-y-6">
              {/* Featured Image/Video for expanded view */}
              {expandedPost.gallery && (
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <CarouselView images={expandedPost.gallery} />
                </div>
              )}
              {expandedPost.mediaType === "video" && (
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <video
                    className="w-full h-full object-cover"
                    src={expandedPost.mediaSrc}
                    poster={expandedPost.poster}
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              )}
              {expandedPost.image && !expandedPost.gallery && (
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <img src={expandedPost.image} alt={expandedPost.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pb-4 border-b">
                <span className="inline-flex items-center gap-2"><Calendar size={16} />{expandedPost.date}</span>
                <span className="inline-flex items-center gap-2"><MapPin size={16} />{expandedPost.location}</span>
                <span className="inline-flex items-center gap-2"><User size={16} />{expandedPost.author}</span>
                {expandedPost.readingTime && (
                  <span className="inline-flex items-center gap-2"><Clock size={16} />{expandedPost.readingTime}</span>
                )}
              </div>

              {/* Subtitle */}
              <p className="text-lg text-muted-foreground italic">{expandedPost.subtitle}</p>

              {/* Full Content */}
              <div className="space-y-4 text-foreground leading-relaxed">
                {expandedPost.content.map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
                ))}
              </div>

              {/* Organizers */}
              {expandedPost.organizers && expandedPost.organizers.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground font-semibold">Organizers</p>
                  <div className="flex flex-wrap gap-2">
                    {expandedPost.organizers.map((org) => (
                      <Badge key={org} variant="outline" className="text-sm">
                        {org}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {expandedPost.tags && expandedPost.tags.length > 0 && (
                <div className="space-y-3 pt-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground font-semibold">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {expandedPost.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <Button 
                onClick={() => setExpandedPostId(null)}
                variant="outline"
                className="w-full mt-6"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Blog;
