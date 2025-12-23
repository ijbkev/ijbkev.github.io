import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, Lightbulb, Heart, ArrowRight, CheckCircle, UserPlus, Calendar, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
const Join = () => {
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Get Involved with IJBK e.V.
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            Connect with our community and be part of innovative projects 
            that create positive impact across Europe and beyond.
          </p>
          <div className="flex justify-center">
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white hover:bg-white text-slate-900">
                <Mail className="mr-2 h-5 w-5" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Partnership Information */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Partnership Opportunities
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Join us in creating positive impact! We welcome collaborations with organizations, 
              institutions, and individuals who share our mission.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="p-6 text-center shadow-medium hover:shadow-strong transition-all duration-300">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Organizations</h3>
                <p className="text-muted-foreground">
                  Partner with us on Erasmus+ projects and youth development initiatives
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-6 text-center shadow-medium hover:shadow-strong transition-all duration-300">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">International</h3>
                <p className="text-muted-foreground">
                  Expand your reach through European cooperation and cultural exchange
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-6 text-center shadow-medium hover:shadow-strong transition-all duration-300">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Innovation</h3>
                <p className="text-muted-foreground">
                  Collaborate on digital solutions and sustainable development projects
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="max-w-3xl mx-auto shadow-medium">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">Partnership Identification Form (PIF)</h3>
              <p className="text-lg text-muted-foreground mb-6">
                Download our comprehensive partnership guide to learn more about collaboration opportunities, 
                our experience, and how we can work together.
              </p>
              <a href="https://drive.google.com/file/d/1rLm0rNJaEvnCWRtcNXElIktl0NKYhZZA/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="font-semibold">
                  <UserPlus className="mr-2 h-5 w-5" />
                  View Partnership Information File (PIF)
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Join;