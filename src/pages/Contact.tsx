import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
const Contact = () => {
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Contact Us
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Get in touch with IJBK e.V. We're here to answer your questions and explore collaboration opportunities.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Our Location</h3>
                      <p className="text-muted-foreground">Our office address</p>
                    </div>
                  </div>
                  <div className="ml-16">
                    <p className="text-muted-foreground">
                      Gerhart-Hauptmann-Str. 24, 216A<br />
                      67663 Kaiserslautern, Germany
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Email</h3>
                      <p className="text-muted-foreground">Send us a message</p>
                    </div>
                  </div>
                  <div className="ml-16">
                    <a href="mailto:ijbk.connect@gmail.com" className="text-primary hover:text-primary/80 transition-colors font-medium">
                      ijbk.connect@gmail.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Office Hours</h3>
                      <p className="text-muted-foreground">When we're available</p>
                    </div>
                  </div>
                  <div className="ml-16">
                    <p className="text-muted-foreground">
                      Monday - Friday<br />
                      11:00 AM - 4:00 PM (CET)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">WhatsApp</h3>
                      <p className="text-muted-foreground">Call us or Message us on WhatsApp</p>
                    </div>
                  </div>
                  <div className="ml-16">
                    <a href="https://wa.me/4915253482040" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors font-medium">
                      +49 152 53482040
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Contact;