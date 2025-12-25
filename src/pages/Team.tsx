import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import viditImage from "@/assets/vidit.jpg";
import omImage from "@/assets/om.png";
import lenochkaImage from "@/assets/lenochka.png";
import babaImage from "@/assets/baba.png";
import prateekImage from "@/assets/prateek.png";
import alexImage from "@/assets/alex.png";

const Team = () => {
  const teamMembers = [
    {
      name: "Vidit Goyal",
      role: "Legal Representative & Chairman",
      expertise: "Artificial Intelligence & Youth Development",
      country: "India",
      bio: "MSc in Artificial Intelligence (RPTU). Experienced youth worker with extensive Erasmus+ participation. AI research specialization in time series forecasting and pose estimation. NGO volunteering and English teaching experience in India with project planning and development leadership. Diploma in Nutrition and Conflict Management.",
      skills: ["AI Research", "Time Series Forecasting", "Pose Estimation", "Youth Work", "Project Planning", "English Teaching"]
    },
    {
      name: "Rohit Singh Negi", 
      role: "Deputy Chairman",
      expertise: "Software Engineering & Project Management",
      country: "India",
      bio: "Expert in software engineering with strong focus on project planning and coordination. Provides implementation supervision working closely with the legal representative and manages reimbursement processes for organizational operations.",
      skills: ["Software Engineering", "Project Planning", "Implementation Supervision", "Reimbursement Management"]
    },
    {
      name: "Om Tiwari",
      role: "Founding Member",
      expertise: "Data Science & Social Advocacy",
      country: "India",
      bio: "Data Science expert with active participation in student organizations. Passionate advocate for sustainability and social justice initiatives while managing social media and PR responsibilities for various projects and organizations.",
      skills: ["Data Science", "Student Organizations", "Sustainability Advocacy", "Social Justice", "Social Media", "PR Management"]
    },
    {
      name: "Alex C.",
      role: "Team Member",
      expertise: "Participant Selection",
      country: "Germany",
      bio: "Specialized in participant selection processes for international projects. Expert in evaluating applications, coordinating with partner organizations, and ensuring diverse and qualified participant cohorts for successful program outcomes.",
      skills: ["Participant Selection", "Application Review", "Partner Coordination", "Program Management"]
    },
    {
      name: "Marta Rudzate",
      role: "Founding Member",
      expertise: "Mathematics & Statistics",
      country: "Latvia",
      bio: "Mathematics & Statistics student at University of Latvia with exchange experience at RPTU. ESN volunteer specializing in music sessions and meditation practices. Holds multiple Youthpass certifications and actively engages in climate and peace movement initiatives.",
      skills: ["Mathematics", "Statistics", "ESN Volunteering", "Music Sessions", "Meditation", "Climate Activism"]
    },
    {
      name: "Tamara Suniarová",
      role: "Founding Member",
      expertise: "Psychology & Youth Work",
      country: "Slovakia",
      bio: "Psychology student and experienced youth worker specializing in Erasmus+ project co-creation. Provides refugee support and English teaching services. Expert in sports, mindfulness, acro yoga, and partner acrobatics with extensive experience in multiple Erasmus+ projects focused on well-being and sustainability.",
      skills: ["Psychology", "Youth Work", "Refugee Support", "Sports", "Mindfulness", "Acro Yoga", "Sustainability"]
    },
    {
      name: "Prateek Kumar Sharma",
      role: "Founding Member",
      expertise: "Computer Science & AI Research",
      country: "India",
      bio: "Master's student in Computer Science at RPTU Germany with experience as Research Assistant at DFKI and Software Engineer specializing in Data Science. Expert in AI, ML, NLP, and Computer Vision with active engagement in Erasmus+ projects, youth work, and tech blogging.",
      skills: ["AI", "Machine Learning", "NLP", "Computer Vision", "Data Science", "Research", "Tech Blogging"]
    },
    {
      name: "Yeliena Bemeshchuk",
      role: "Founding Member",
      expertise: "Logistics Management",
      country: "Ukraine",
      bio: "Founding member specializing in logistics management and coordination. Brings essential organizational skills to ensure smooth operations and effective resource management across all IJBK initiatives and projects.",
      skills: ["Logistics Management", "Coordination", "Resource Management", "Operations"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Meet Our Team
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Our diverse team of passionate professionals is dedicated to empowering youth 
            through innovation, culture, and sustainability across Europe and beyond.
          </p>
        </div>
      </section>

      {/* Team Members */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="shadow-soft hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  {/* Profile Photo */}
                  {member.name === "Vidit Goyal" ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-medium">
                      <img 
                        src={viditImage} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : member.name === "Om Tiwari" ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-medium">
                      <img 
                        src={omImage} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : member.name === "Yeliena Bemeshchuk" ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-medium">
                      <img 
                        src={lenochkaImage} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : member.name === "Rohit Singh Negi" ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-medium">
                      <img 
                        src={babaImage} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : member.name === "Prateek Kumar Sharma" ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-medium">
                      <img 
                        src={prateekImage} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : member.name === "Alex C." ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-medium">
                      <img 
                        src={alexImage} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6 shadow-medium">
                      <span className="text-white font-bold text-xl">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {member.name}
                    </h3>
                    <p className="text-primary font-semibold mb-2">
                      {member.role}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      {member.expertise}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {member.country}
                    </p>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {member.bio}
                  </p>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Key Skills:</h4>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill, skillIndex) => (
                        <span 
                          key={skillIndex}
                          className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              What Drives Our Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our team is united by shared values and a common commitment to empowering young people 
              through meaningful experiences and innovative programs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6 shadow-soft">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">🌍</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Global Perspective
              </h3>
              <p className="text-muted-foreground text-sm">
                Bringing international experience and cross-cultural understanding to every project.
              </p>
            </Card>
            
            <Card className="text-center p-6 shadow-soft">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Innovation Focus
              </h3>
              <p className="text-muted-foreground text-sm">
                Constantly exploring new technologies and creative approaches to youth development.
              </p>
            </Card>
            
            <Card className="text-center p-6 shadow-soft">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">🤝</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Collaborative Spirit
              </h3>
              <p className="text-muted-foreground text-sm">
                Working together and building partnerships to maximize impact and reach.
              </p>
            </Card>
            
            <Card className="text-center p-6 shadow-soft">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">💡</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Continuous Learning
              </h3>
              <p className="text-muted-foreground text-sm">
                Always learning and adapting to better serve the youth communities we support.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Team;