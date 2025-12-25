import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Projects = () => {
  const projects = [
    {
      id: "discover-eu",
      title: "Fully Funded Travel Across Europe with DiscoverEU!",
      category: "EU Travel Initiative",
      status: "Upcoming",
      statusColor: "bg-orange-100 text-orange-800",
      date: "1 April 2026",
      location: "Europe",
      participants: "15",
      description: "DiscoverEU is an EU initiative that gives young people the chance to discover Europe by train, experience new cultures, and connect with people across borders. We're forming 3 travel groups with 15 participants (aged 18–21) and 3 accompanying leaders each. All main train travel, accommodation, food, and local transport are covered with no participation fee.",
      highlights: [
        "FREE Interrail Pass",
        "Daily Pocket Money",
        "Cultural Exchange",
        "No Participation Fee"
      ],
      applicationLink: "https://forms.gle/PLDCB35wsTjaHPoP7"
    },
    {
      id: "ai-social-impact",
      title: "AI 4 SOCIAL IMPACT",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusColor: "bg-green-100 text-green-800",
      date: "5 – 12 December 2025",
      location: "Tallinn, Estonia",
      participants: "Estonia, Lithuania, Germany & Poland",
      description: "A transformative youth exchange program exploring how AI can be used for social good. Participants will learn about ethical AI applications, develop innovative solutions for social challenges, and collaborate on projects that can make a positive impact on society.",
      highlights: [
        "AI for Social Good",
        "Ethical AI Development", 
        "Cross-Country Collaboration",
        "Innovation Workshop"
      ]
    },
    {
      id: "ka152",
      title: "KA152: Digitalisation Matters",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusColor: "bg-green-100 text-green-800",
      date: "2024",
      location: "Multiple EU Countries",
      participants: "30+ Young People",
      description: "A comprehensive youth exchange program focused on digital literacy and the impact of digitalization on society. Participants from across Europe came together to explore digital tools, learn about AI technologies, and develop digital skills essential for the modern workforce.",
      highlights: [
        "Digital Skills Workshops",
        "AI Tools Training",
        "Cross-Cultural Collaboration",
        "Project-Based Learning"
      ]
    },
    {
      id: "ka153", 
      title: "KA153: AI Tools 4 Youth Work",
      category: "Erasmus+ Training Course",
      status: "Completed",
      statusColor: "bg-green-100 text-green-800",
      date: "2024",
      location: "Germany & Partner Countries",
      participants: "25 Youth Workers",
      description: "An innovative training course designed to equip youth workers with practical knowledge of AI tools and their application in youth work. The project focused on ethical AI use, practical implementation, and creative applications in educational settings.",
      highlights: [
        "AI Ethics Training",
        "Practical Tool Implementation",
        "Youth Worker Capacity Building",
        "Resource Development"
      ]
    },
    {
      id: "ai-culinary",
      title: "AI & Culinary Journey in Türkiye",
      category: "Cultural Exchange",
      status: "Completed",
      statusColor: "bg-green-100 text-green-800",
      date: "2025",
      location: "Türkiye",
      participants: "20 Participants",
      description: "An exciting intercultural project combining artificial intelligence education with culinary experiences in Türkiye. Participants explore Turkish culture while learning about AI applications in the food industry and traditional cooking methods.",
      highlights: [
        "Cultural Immersion",
        "AI in Food Industry",
        "Traditional Cooking",
        "Technology Integration"
      ]
    },
    {
      id: "hiking-tours",
      title: "Sustainability Hiking Tours",
      category: "Environmental Initiative",
      status: "Ongoing",
      statusColor: "bg-blue-100 text-blue-800", 
      date: "2025",
      location: "Kaiserslautern Region",
      participants: "ESN Kaiserslautern Partnership",
      description: "Collaborative sustainability-focused hiking tours with ESN Kaiserslautern, combining outdoor activities with environmental education. These tours promote sustainable tourism practices and environmental awareness among international and local students.",
      highlights: [
        "Environmental Education",
        "Sustainable Tourism",
        "Local Partnerships",
        "Outdoor Learning"
      ]
    }
  ];


  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-2 sm:px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Our Projects & Achievements
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Discover our impact through innovative Erasmus+ programs, sustainability initiatives, 
            and intercultural learning experiences that empower young people across Europe.
          </p>
        </div>
      </section>

      {/* Main Projects */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-0">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Featured Projects</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {projects.map((project, index) => (
              <Card key={project.id} className={`shadow-soft hover:shadow-medium transition-all duration-300 ${project.id === 'discover-eu' ? 'border-2 border-yellow-400' : ''}`}>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                      <CardTitle className="text-2xl text-foreground mb-2">{project.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="text-primary border-primary">
                          {project.category}
                        </Badge>
                        <Badge className={project.statusColor}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar size={16} />
                        <span>{project.date}</span>
                      </div>
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin size={16} />
                        <span>{project.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users size={16} />
                        <span>{project.participants}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {project.description}
                  </p>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Key Highlights:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {project.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                          <span className="text-muted-foreground">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {project.applicationLink && (
                    <div className="mt-6 pt-4 border-t">
                      <a 
                        href={project.applicationLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                      >
                        Apply Now
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Project Statistics */}
      <section className="py-16 bg-gradient-subtle relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="container mx-auto px-2 sm:px-4 lg:px-6 relative z-10">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Our Impact</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center group">
              <div className="bg-white rounded-lg shadow-medium p-6 hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform duration-300">2</div>
                <div className="text-muted-foreground font-medium">Projects Completed</div>
              </div>
            </div>
            <div className="text-center group">
              <div className="bg-white rounded-lg shadow-medium p-6 hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform duration-300">4000+</div>
                <div className="text-muted-foreground font-medium">Youth Impacted</div>
              </div>
            </div>
            <div className="text-center group">
              <div className="bg-white rounded-lg shadow-medium p-6 hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform duration-300">15</div>
                <div className="text-muted-foreground font-medium">EU Countries</div>
              </div>
            </div>
            <div className="text-center group">
              <div className="bg-white rounded-lg shadow-medium p-6 hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform duration-300">100%</div>
                <div className="text-muted-foreground font-medium">EU Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Projects;