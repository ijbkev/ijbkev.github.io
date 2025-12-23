import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Linkedin } from "lucide-react";
const Footer = () => {
  return <footer className="bg-muted border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Organization Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">IJ</span>
              </div>
              <span className="text-xl font-bold text-foreground">IJBK e.V.</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.
              <br />
              Registration Number: VR 31177 | Kaiserslautern District Court
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                
                
              </div>
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span>ijbk.connect@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone size={16} />
                <a href="https://wa.me/4915253482040" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">+49 152 53482040</a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors">
                About Us
              </Link>
              <Link to="/projects" className="block text-muted-foreground hover:text-primary transition-colors">
                Projects
              </Link>
              <Link to="/team" className="block text-muted-foreground hover:text-primary transition-colors">
                Team
              </Link>
              <Link to="/join" className="block text-muted-foreground hover:text-primary transition-colors">
                Join Us
              </Link>
            </div>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <div className="flex space-x-4 mb-4">
              <a href="https://www.instagram.com/ijbk.ev" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-muted-foreground">
              © 2025 IJBK e.V. All rights reserved. | Registered Non-Profit Organization
            </div>
            <div className="text-sm text-muted-foreground">Our Projects are funded by the Erasmus+ Programme of the European Union.</div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;