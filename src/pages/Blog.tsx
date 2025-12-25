import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Tag } from "lucide-react";
import actItOutImage from "@/assets/act-it-out.jpg";
import aiSocialImpactImage from "@/assets/ye-social-estonia.jpeg";

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
      readingTime: "3 min read",
      author: "IJBK Team",
      image: aiSocialImpactImage,
      featured: true,
      content: [
        "We took part in the Erasmus+ Youth Exchange AI 4 Social Impact in Tallinn, Estonia, from 5th to 12th December 2025. During this inspiring week, young people explored how Artificial Intelligence can be used ethically and responsibly to create positive social change.",
        "Together with participants from different European countries, supported by experienced facilitators and partner organisations, we learned about AI ethics, digital responsibility, and social innovation through non-formal education, hands-on workshops, and teamwork. We reflected on real societal challenges and designed AI-based ideas and solutions that can make a meaningful impact in our local communities.",
        "Beyond learning, the exchange fostered strong intercultural connections, collaboration, and a shared vision of young people as active changemakers shaping a fairer digital future."
      ],
      organizers: [
        "Estonian National Youth Council (ENL)",
        "Leap2Peak",
        "Asociacija Tavo Europa",
        "Fundacja Leonarda",
        "Internationaler Jugend- und Bildungsverein Kaiserslautern e.V."
      ],
      tags: ["AI4SocialImpact", "ErasmusPlus", "YouthExchange", "EthicalAI", "DigitalForGood", "Erasmus"]
    },
    {
      id: "act-it-out",
      title: "Act it Out!",
      subtitle: "Theatre Techniques for Social Change",
      category: "Training Course",
      categoryColor: "bg-green-100 text-green-800",
      date: "October 2025",
      location: "Debrecen, Hungary",
      readingTime: "2 min read",
      author: "IJBK Team",
      image: actItOutImage,
      featured: false,
      content: [
        "We took part in an Erasmus+ Training Course in Debrecen, Hungary, from 28th September to 7th October 2025. Over these 10 inspiring days, youth workers explored the creative methods of Image Theatre, Forum Theatre, and Newspaper Theatre, discovering how to use them as powerful tools for driving social change in their communities.",
        "Together with 30 youth workers, supported by 2 trainers and 7 partner organisations, we learned to apply these theatre techniques as performers, facilitators, and changemakers — fostering inclusion and giving voice to vulnerable young people."
      ],
      organizers: [
        "@brujulaintercultura", "@eplus_rptu", "@sehzadelerr", "@hellasforus",
        "@nadejda.crd", "@cehvidit", "@ijbk.ev", "@ascointerasmus", "@hangkepe"
      ],
      tags: ["actitout", "erasmus"]
    }
  ];

  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-hero py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Our Blog
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            Stories, insights, and experiences from our Erasmus+ projects and youth initiatives across Europe
          </p>
        </div>
      </section>

      <main className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* All Articles Grid */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-2">Latest Articles</h2>
              <div className="w-24 h-1 bg-primary mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {blogPosts.map((post) => (
                <Card key={post.id} className={`overflow-hidden shadow-medium hover:shadow-strong transition-all duration-300 group ${post.featured ? 'ring-2 ring-primary/20' : ''}`}>
                  <div className="aspect-video overflow-hidden relative">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {post.featured && (
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary text-primary-foreground">
                          Featured
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <Badge className={`${post.categoryColor} mb-2`}>
                        {post.category}
                      </Badge>
                      <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {post.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </div>
                    </div>

                    <div className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {post.content.map((paragraph, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-3' : ''}>{paragraph}</p>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Categories Sidebar */}
          <aside className="mt-16 bg-muted rounded-lg p-8">
            <h3 className="text-xl font-bold text-foreground mb-6">Explore by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-shadow">
                <div className="text-2xl font-bold text-primary mb-1">2</div>
                <div className="text-sm text-muted-foreground">Articles</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-shadow">
                <div className="text-2xl font-bold text-green-600 mb-1">1</div>
                <div className="text-sm text-muted-foreground">Training Courses</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-shadow">
                <div className="text-2xl font-bold text-blue-600 mb-1">1</div>
                <div className="text-sm text-muted-foreground">Youth Exchanges</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-soft hover:shadow-medium transition-shadow">
                <div className="text-2xl font-bold text-purple-600 mb-1">10</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
