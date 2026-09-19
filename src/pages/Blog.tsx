import MapHeroAccent from "@/components/MapHeroAccent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type BlogPost = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryColor: string;
  date: string;
  location: string;
  readingTime: string;
  author: string;
  image?: string;
  gallery?: string[];
  galleryCaptions?: string[];
  mediaType?: "video";
  mediaSrc?: string;
  poster?: string;
  content: string[];
  organizers?: string[];
  tags: string[];
  featured?: boolean;
};

const blogPosts: BlogPost[] = [
    {
      id: "sharing-youth-work-practice-sibenik-2026",
      title: "🇭🇷 Sharing Youth Work Practice: Social Inclusion & Community-Based Approaches",
      subtitle: "A study visit in Šibenik where youth workers exchanged ideas, built connections, and explored inclusive local practice.",
      category: "Study Visit",
      categoryColor: "bg-sky-100 text-sky-800",
      date: "17–21 August 2026",
      location: "Šibenik, Croatia",
      readingTime: "2 min read",
      author: "IJBK Team",
      image: "/lovable-uploads/sibenik-2026/social-inclusion-community-discussion.jpeg",
      gallery: [
        "/lovable-uploads/sibenik-2026/social-inclusion-community-discussion.jpeg",
        "/lovable-uploads/sibenik-2026/camille-and-gurkan.jpeg",
        "/lovable-uploads/sibenik-2026/create-your-own-project.jpeg",
        "/lovable-uploads/sibenik-2026/green-flag-project.jpeg",
        "/lovable-uploads/sibenik-2026/equine-rehabilitation-therapy.jpeg",
        "/lovable-uploads/sibenik-2026/friendships-zlarin-boat.jpeg",
        "/lovable-uploads/sibenik-2026/friendships-zlarin-island.jpeg",
      ],
      galleryCaptions: [
        "A conversation on social inclusion and community-based support.",
        "Intergenerational learning with Altino, and his stories on \"the wild times in Portugal\" 🇵🇹 😜",
        "Presentation of the \"Create Your Own Project\" session outcomes.",
        "The \"Green Flag\" project is already on the tracks 😜 💚",
        "Presentation of equine rehabilitation therapy.",
        "New friendships created on the way to Zlarin Island.",
        "New friendships created on the way to Zlarin Island.",
      ],
      content: [
        "From 17–21 August 2026, we joined the Erasmus+ Study Visit \"Sharing Youth Work Practice: Social Inclusion & Community-Based Approaches\" in Šibenik, Croatia.",
        "Hosted by Udruga Impress, the programme focused strongly on learning directly from local organisations and communities. We visited a local youth centre, explored approaches to intergenerational solidarity at an elderly care home, and learned about the work of an association supporting people living with multiple sclerosis.\n\nThese visits showed us that inclusion is not only about creating opportunities for young people. It is also about reducing isolation, strengthening support networks, increasing participation and making communities more accessible for everyone.",
        "Across workshops, local visits, and conversations with fellow youth workers, we exchanged practical ideas for building communities where every young person can take part. The week made space for new project ideas, inspiring approaches to inclusion, and connections that continued beyond the programme.",
        "From the \"Create Your Own Project\" outcomes and the first steps of the Green Flag project to an introduction to equine rehabilitation therapy, every activity added a new perspective. And, of course, the boat trip to Zlarin Island brought its own special kind of learning: new friendships. 🇪🇺",
      ],
      tags: ["ErasmusPlus", "StudyVisit", "YouthWork", "SocialInclusion", "CommunityBasedApproaches", "Croatia"],
    },
    {
      id: "green-stage-sustainable-future",
      title: "Green Stage for Sustainable Future 🎭♻️",
      subtitle:
        "A youth exchange in Steinsholt, Norway, where theatre and sustainability took center stage.",
      category: "Youth Exchange",
      categoryColor: "bg-emerald-100 text-emerald-800",
      date: "22–31 May 2026",
      location: "Steinsholt, Norway",
      readingTime: "2 min read",
      author: "IJBK Team",
      image: "/lovable-uploads/gogreen/1.jpg",
      featured: false,
      gallery: [
        "/lovable-uploads/gogreen/1.jpg",
        "/lovable-uploads/gogreen/2.jpg",
        "/lovable-uploads/gogreen/3.jpg",
        "/lovable-uploads/gogreen/4.jpg",
        "/lovable-uploads/gogreen/5.jpg",
        "/lovable-uploads/gogreen/6.jpg",
        "/lovable-uploads/gogreen/7.jpg",
        "/lovable-uploads/gogreen/8.jpg",
        "/lovable-uploads/gogreen/9.jpg",
        "/lovable-uploads/gogreen/10.jpg",
        "/lovable-uploads/gogreen/11.jpg",
        "/lovable-uploads/gogreen/12.jpg",
      ],
      content: [
        "From 22–31 May 2026, we organised the Erasmus+ Youth Exchange Green Stage for Sustainable Future in Steinsholt, Norway, bringing together 30 young people from Germany, Norway, Türkiye, Spain, Italy, and the Netherlands.",
        "Through theatre, outdoor activities, eco-workshops, and intercultural learning, participants explored climate change, sustainability, and practical green habits. Together, they created original performances and shared their ideas with the local community. 🎭♻️",
      ],
      tags: ["GoGreen", "ErasmusPlus", "YouthExchange", "Sustainability", "Climate"],
    },
    {
      id: "discoverEU-memories-2026",
      title: "DiscoverEU Memories Journal 2026 🚆✨",
      subtitle: "Three DiscoverEU groups, 20 days, one unforgettable journey across Europe by train.",
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
        "Using Image, Forum, and Newspaper Theatre as tools for social change in Debrecen, Hungary.",
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
    {
      id: "digitalisation-matters-2024",
      title: "Digitalisation Matters 🇩🇪",
      subtitle:
        "Exploring digital skills, media literacy, and online safety with youth across Europe in Euskirchen, Germany.",
      category: "Youth Exchange",
      categoryColor: "bg-indigo-100 text-indigo-800",
      date: "5–14 July 2024",
      location: "Euskirchen, Germany",
      readingTime: "2 min read",
      author: "IJBK Team",
      image: "/lovable-uploads/digimat/1.jpg",
      featured: false,
      gallery: [
        "/lovable-uploads/digimat/1.jpg",
        "/lovable-uploads/digimat/2.jpg",
        "/lovable-uploads/digimat/3.jpg",
        "/lovable-uploads/digimat/4.jpg",
        "/lovable-uploads/digimat/5.jpg",
      ],
      content: [
        "From 5–14 July 2024, young minds from across Europe gathered in Euskirchen, Germany, for the Erasmus+ Youth Exchange \"Digitalisation Matters: A Youth Exchange on Digital Skills\" 🇩🇪 — exploring the world of digital skills and education together. 💡🌍✨",
        "Workshops & Activities:\nEngaging sessions on digital concepts, media literacy, and critical thinking abilities. Practical workshops on online reputation, hacking & online security, and AI pros and cons. Activities on cyberbullying, e-health, and the importance of digital education.",
        "Cultural Exchange:\nImmersive experiences in Euskirchen, connecting with local communities and exploring the region's rich industrial heritage. Intercultural nights featuring food, games, and dances from various countries.",
        "Inspiration:\nParticipants left empowered to tackle youth unemployment through innovative digital solutions, with an enhanced public understanding of the value of digital education and its impact on future careers.",
        "A heartfelt thanks to the European Commission for co-funding this transformative project. Together, we can foster a more resilient, inclusive, and digitally skilled future for youth worldwide.",
      ],
      organizers: ["European Commission"],
      tags: ["germany", "eu"],
    },
  ];

const Blog = () => {

  const CarouselView = ({ images, captions = [] }: { images: string[]; captions?: string[] }) => {
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
        {captions[currentIndex] && (
          <p className="absolute bottom-12 left-4 right-4 text-sm font-medium leading-snug text-white drop-shadow-md">
            {captions[currentIndex]}
          </p>
        )}
        
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

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <section className="map-page-hero relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white scroll-fade section-chrome">
        <MapHeroAccent subtle />
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
                    <CarouselView images={post.gallery} captions={post.galleryCaptions} />
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
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link to={`/blog/${post.id}`}>Read Full Story</Link>
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

    </div>
  );
};

export default Blog;

export const BlogActivity = () => {
  const { activityId } = useParams();
  const post = blogPosts.find((item) => item.id === activityId);
  const [currentImage, setCurrentImage] = useState(0);

  if (!post) return <Navigate to="/blog" replace />;
  const images = post.gallery ?? (post.image ? [post.image] : []);

  return <main className="page-shell py-12 md:py-20"><Link to="/blog" className="inline-flex items-center gap-2 text-primary font-semibold mb-8">← Back to all stories</Link><article className="max-w-4xl mx-auto space-y-8"><header className="space-y-4"><Badge className={post.categoryColor}>{post.category}</Badge><h1 className="text-4xl md:text-5xl font-semibold">{post.title}</h1><p className="text-xl text-muted-foreground">{post.subtitle}</p><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Calendar size={16} />{post.date}</span><span className="inline-flex items-center gap-2"><MapPin size={16} />{post.location}</span><span className="inline-flex items-center gap-2"><User size={16} />{post.author}</span><span className="inline-flex items-center gap-2"><Clock size={16} />{post.readingTime}</span></div></header>{post.mediaType === "video" ? <div className="aspect-video overflow-hidden rounded-2xl bg-muted"><video className="w-full h-full object-cover" src={post.mediaSrc} poster={post.poster} controls playsInline preload="metadata" /></div> : images.length > 0 ? <section className="space-y-3"><div className="aspect-video overflow-hidden rounded-2xl bg-muted"><img src={images[currentImage]} alt={`${post.title} — image ${currentImage + 1}`} className="w-full h-full object-cover" /></div>{post.galleryCaptions?.[currentImage] && <p className="text-sm text-muted-foreground italic px-1">{post.galleryCaptions[currentImage]}</p>}{images.length > 1 && <div className="flex flex-wrap gap-2">{images.map((image, index) => <button key={image} onClick={() => setCurrentImage(index)} className={`h-16 w-20 overflow-hidden rounded-md border-2 ${index === currentImage ? "border-primary" : "border-transparent"}`} aria-label={`Show image ${index + 1}: ${post.galleryCaptions?.[index] ?? "gallery image"}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>}</section> : null}<div className="space-y-4 text-foreground leading-relaxed text-lg">{post.content.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>{post.organizers?.length ? <section className="space-y-3 pt-4 border-t"><h2 className="text-sm uppercase tracking-[0.18em] text-muted-foreground font-semibold">Organizers</h2><div className="flex flex-wrap gap-2">{post.organizers.map((org) => <Badge key={org} variant="outline">{org}</Badge>)}</div></section> : null}<section className="space-y-3 pt-4"><h2 className="text-sm uppercase tracking-[0.18em] text-muted-foreground font-semibold">Tags</h2><div className="flex flex-wrap gap-2">{post.tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}</div></section></article></main>;
};
