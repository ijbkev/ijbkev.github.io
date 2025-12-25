import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, Globe, Lightbulb, Leaf, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-background.jpg";
import euFundingLogo from "@/assets/eu-funding-logo.png";
const Homepage = () => {
  const missionAreas = [{
    icon: <Lightbulb className="w-8 h-8 text-white" />,
    title: "Digital Skills & AI",
    description: "Empowering youth with cutting-edge digital literacy and AI knowledge"
  }, {
    icon: <Users className="w-8 h-8 text-white" />,
    title: "Social Entrepreneurship",
    description: "Building innovative solutions for social impact and community development"
  }, {
    icon: <Globe className="w-8 h-8 text-white" />,
    title: "Intercultural Learning",
    description: "Fostering cultural exchange and global understanding through Erasmus+"
  }, {
    icon: <Leaf className="w-8 h-8 text-white" />,
    title: "Sustainability",
    description: "Creating environmental awareness and sustainable practices for the future"
  }];
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-cover bg-center" style={{
      backgroundImage: `url(${heroImage})`
    }}>
        <div className="absolute inset-0 bg-gradient-hero opacity-80"></div>
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{
        backgroundImage: `url(/lovable-uploads/af132948-383f-4457-b6d1-b297a65c571a.png)`
      }}></div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-sm bg-black/20 rounded-2xl p-8 mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-medium">Empowering Youth through Innovation, Culture & Sustainability Funded by Erasmus+ Projects.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/about">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                About Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/projects">
              <Button size="lg" variant="outline" className="border-white hover:bg-white text-slate-950">
                Our Projects
              </Button>
            </Link>
            <Link to="/join">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                Partnership
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mission Areas - More Visual */}
      <section className="py-16 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-subtle opacity-50"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Mission Areas
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We focus on four key areas to empower young people and create positive impact in our communities and beyond.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {missionAreas.map((area, index) => <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-white to-muted border-0 shadow-medium hover:shadow-strong transition-all duration-500 hover:-translate-y-2 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                <CardContent className="p-8 relative z-10">
                  <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center shadow-soft group-hover:shadow-medium transition-shadow duration-300">
                      <div className="text-white text-2xl group-hover:scale-110 transition-transform duration-300">
                        {area.icon}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                    {area.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {area.description}
                  </p>
                  <div className="mt-6 h-1 bg-gradient-hero rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                About IJBK e.V.
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Founded on July 8th, 2025, the Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. 
                evolved from the Studentisches Netzwerk der RPTU to become a registered non-profit organization 
                dedicated to youth empowerment.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Based in Kaiserslautern, Germany, we create opportunities for young people to develop digital skills, 
                engage in sustainable practices, and participate in meaningful intercultural exchanges through 
                Erasmus+ programs and local initiatives.
              </p>
              <Link to="/about">
                <Button size="lg" className="font-semibold">
                  Learn More About Us
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">2025</h3>
                <p className="text-muted-foreground">Founded</p>
              </Card>
              <Card className="p-6 text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">4</h3>
                <p className="text-muted-foreground">Mission Areas</p>
              </Card>
              <Card className="p-6 text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">7</h3>
                <p className="text-muted-foreground">Team Members</p>
              </Card>
              <Card className="p-6 text-center">
                <h3 className="text-2xl font-bold text-primary mb-2">100%</h3>
                <p className="text-muted-foreground">Non-Profit</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Past Projects Gallery */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Moments from Our Past Projects
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Some highlights from our journey as organizers and partners in various initiatives across Europe.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="aspect-square overflow-hidden">
                <img src="/lovable-uploads/49b61ef9-3596-4028-bfde-d476a7bea249.png" alt="Youth exchange project" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Be a Leader</h3>
                <p className="text-muted-foreground text-sm">Targoviste, Romania</p>
              </CardContent>
            </Card>
            
            <Card className="group overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="aspect-square overflow-hidden">
                <img src="/lovable-uploads/c4c1f046-ccc5-4e93-852a-0da78fda170b.png" alt="Youth exchange project" className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Act it Out!</h3>
                <p className="text-muted-foreground text-sm">Debrecen, Hungary</p>
              </CardContent>
            </Card>
            
            <Card className="group overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="aspect-square overflow-hidden">
                <img src="/lovable-uploads/14025e70-2537-4558-9ecb-3bde034b333f.png" alt="Group collaboration" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">AI Tools 4 Youth Work</h3>
                <p className="text-muted-foreground text-sm">North Macedonia</p>
              </CardContent>
            </Card>
            
            <Card className="group overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="aspect-square overflow-hidden">
                <img src="/lovable-uploads/94060860-f177-45f6-8e5f-4455f97eb693.png" alt="Cultural exchange" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Digitalization Matters</h3>
                <p className="text-muted-foreground text-sm">Germany</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Upcoming Initiatives */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Upcoming Initiatives
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Exciting new projects and opportunities are in development.
            </p>
          </div>
          
          {/* Horizontal cards layout */}
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6">
              <Card className="lg:w-2/5 bg-gradient-hero p-8 shadow-medium hover:shadow-strong transition-all duration-300 animate-fade-in">
                <CardContent className="p-0 text-white">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3">Fully Funded Travel Across Europe with DiscoverEU! ✨🌍</h3>
                      <p className="text-white/90 text-sm mb-3">Travel. Explore. Make memories — with your DiscoverEU Interrail Pass included.</p>
                      <p className="text-white/90 leading-relaxed mb-4">
                        <strong>What is DiscoverEU?</strong><br/>
                        DiscoverEU is an EU initiative that gives young people the chance to discover Europe by train, experience new cultures, and connect with people across borders — learning through real travel.<br/><br/>
                        <strong>1️⃣ Who can join?</strong><br/>
                        We're forming 3 travel groups with:<br/>
                        • 15 participants (aged 18–21)<br/>
                        • 3 accompanying leaders (18+) to support coordination and safety<br/><br/>
                        <strong>2️⃣ What's covered?</strong><br/>
                        ✅ FREE DiscoverEU / Interrail Pass (main train travel across Europe)<br/>
                        ✅ Daily pocket money (individual support) for:<br/>
                        🛏️ Hostel / accommodation<br/>
                        🍽️ Food<br/>
                        🚇 Local transport (bus/metro)<br/><br/>
                        <strong>3️⃣ No participation fee</strong><br/><br/>
                        📅 Start: 1 April 2026 (tentative)
                      </p>
                      <a 
                        href="https://forms.gle/PLDCB35wsTjaHPoP7" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-white text-primary hover:bg-white/90 h-9 px-3 py-1"
                      >
                        Apply Now
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="lg:w-3/5 space-y-4">
                <Card className="bg-gradient-subtle p-6 shadow-medium hover:shadow-strong transition-all duration-300 hover-scale">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Partnerships</h3>
                        <p className="text-muted-foreground text-sm">Building new collaborations across Europe</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-secondary p-6 shadow-medium hover:shadow-strong transition-all duration-300 hover-scale">
                  <CardContent className="p-0 text-secondary-foreground">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1">Innovation</h3>
                        <p className="opacity-80 text-sm">Developing cutting-edge digital solutions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* EU Funding Recognition */}
      <section className="py-16 bg-muted">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 text-center shadow-medium">
              <CardContent className="p-0">
                <img src="/lovable-uploads/1c6cd6cd-95e8-4227-84d0-246ca492d9a8.png" alt="Erasmus+ Programme" className="h-20 w-auto object-contain mx-auto mb-6" />
                <p className="text-muted-foreground">
                  Proudly participating in Erasmus+ programmes to empower European youth
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-8 text-center shadow-medium">
              <CardContent className="p-0">
                <img src="/lovable-uploads/10b5b39b-baa5-4822-aa8c-25a360e74a7a.png" alt="Co-funded by the European Union" className="h-20 w-auto object-contain mx-auto mb-6" />
                <p className="text-muted-foreground">
                  Our projects receive support through European Union funding programmes
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Homepage;