import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import actItOutImage from "@/assets/act-it-out.jpg";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Blog
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Stories, updates, and insights from our projects and activities
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden shadow-medium hover:shadow-strong transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src={actItOutImage} 
                  alt="Act it Out! Training Course participants in Debrecen, Hungary" 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-8">
                <div className="mb-4">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    Act it Out!
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Debrecen, Hungary
                  </p>
                </div>
                
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We took part in an Erasmus+ Training Course in Debrecen, Hungary, from 28th September to 7th October 2025.
                    Over these 10 inspiring days, youth workers explored the creative methods of Image Theatre, Forum Theatre, and Newspaper Theatre, discovering how to use them as powerful tools for driving social change in their communities.
                  </p>
                  
                  <p>
                    Together with 30 youth workers, supported by 2 trainers and 7 partner organisations, we learned to apply these theatre techniques as performers, facilitators, and changemakers — fostering inclusion and giving voice to vulnerable young people.
                  </p>
                  
                  <div className="pt-4">
                    <p className="font-semibold text-foreground mb-2">
                      This project was funded by the European Union and organised by:
                    </p>
                    <p className="text-sm">
                      @brujulaintercultura @eplus_rptu @sehzadelerr @hellasforus @nadejda.crd @cehvidit @ijbk.ev @ascointerasmus @hangkepe
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <p className="text-primary font-medium">
                      #actitout #erasmus
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
