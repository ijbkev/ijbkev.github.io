import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Target } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
const About = () => {
  const missionAreas = [{
    title: "Digital Skills & AI",
    description: "We provide comprehensive training in digital literacy, artificial intelligence tools, and emerging technologies to prepare youth for the digital economy.",
    color: "bg-blue-100 text-blue-800"
  }, {
    title: "Social Entrepreneurship",
    description: "We support young entrepreneurs in developing innovative solutions to social challenges, fostering business skills with social impact.",
    color: "bg-green-100 text-green-800"
  }, {
    title: "Intercultural Learning",
    description: "Through Erasmus+ programs and international exchanges, we promote cultural understanding and global citizenship among young people.",
    color: "bg-purple-100 text-purple-800"
  }, {
    title: "Sustainability",
    description: "We engage youth in environmental initiatives, sustainable practices, and climate action to create a more sustainable future.",
    color: "bg-emerald-100 text-emerald-800"
  }];
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About IJBK e.V.
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. - 
            A registered non-profit organization dedicated to empowering youth through innovation, culture, and sustainability.
          </p>
        </div>
      </section>

      {/* Organization Overview */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <Card className="p-6 text-center shadow-soft">
              <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Founded</h3>
              <p className="text-2xl font-bold text-primary">July 8, 2025</p>
              <p className="text-muted-foreground mt-2">Registered Non-Profit</p>
            </Card>
            <Card className="p-6 text-center shadow-soft">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Location</h3>
              <p className="text-lg font-semibold">Kaiserslautern</p>
              <p className="text-muted-foreground">Germany</p>
            </Card>
            <Card className="p-6 text-center shadow-soft">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Legal Status</h3>
              <p className="text-lg font-semibold">e.V.</p>
              <p className="text-muted-foreground">Eingetragener Verein</p>
            </Card>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
            <p className="text-lg text-muted-foreground mb-6">
              IJBK e.V. evolved from the <strong>Studentisches Netzwerk der RPTU</strong> (Student Network of 
              Rheinland-Pfälzische Technische Universität Kaiserslautern-Landau) to become a registered 
              non-profit organization on July 8th, 2025.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              What started as a student initiative has grown into a comprehensive youth development organization 
              that creates opportunities for young people to engage with cutting-edge technology, participate in 
              international exchanges, and contribute to sustainable development goals.
            </p>
            <p className="text-lg text-muted-foreground">Today, we are proud to be part of the European Union's Erasmus+ program, working with partners across Europe to create meaningful learning experiences and foster intercultural understanding among young people.</p>
          </div>
        </div>
      </section>

      {/* Mission Areas */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Our Mission Areas
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We focus on four interconnected areas that are crucial for youth development in the 21st century.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {missionAreas.map((area, index) => <Card key={index} className="shadow-soft hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <Target className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-semibold text-foreground">{area.title}</h3>
                        
                      </div>
                      <p className="text-muted-foreground">{area.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Vision & Values */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Vision</h2>
              <p className="text-lg text-muted-foreground mb-6">
                We envision a world where young people are equipped with the skills, knowledge, and networks 
                needed to address global challenges and create positive change in their communities.
              </p>
              <p className="text-lg text-muted-foreground">
                Through our programs, we aim to bridge the gap between traditional education and the rapidly 
                evolving demands of the digital age, while fostering intercultural understanding and 
                environmental consciousness.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Values</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-foreground">Innovation</h4>
                    <p className="text-muted-foreground">Embracing new technologies and creative approaches</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-foreground">Inclusion</h4>
                    <p className="text-muted-foreground">Creating opportunities for all young people</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-foreground">Sustainability</h4>
                    <p className="text-muted-foreground">Building a better future for our planet</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-foreground">Collaboration</h4>
                    <p className="text-muted-foreground">Working together across cultures and borders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default About;