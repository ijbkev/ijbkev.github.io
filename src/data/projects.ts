export type Project = {
  id: string;
  title: string;
  category: string;
  status: string;
  statusTone: string;
  date: string;
  location: string;
  description: string;
  highlights: string[];
  coverImage: string;
  coverAlt: string;
  applicationLink?: string;
  applicationLabel?: string;
};


export const projects: Project[] = [
    {
      id: "oasis",
      title: "🌴 OASIS",
      category: "Erasmus+ Youth Exchange",
      status: "Upcoming",
      statusTone: "warning",
      date: "31 October–8 November 2026",
      location: "Hammamet, Tunisia",
      description:
        "Youth exchange exploring online safety, scams, misinformation, manipulation techniques, verification tools, digital resilience, and responsible online behaviour.",
      highlights: ["Online safety & scams", "Digital resilience", "Anti-Scam Escape Room", "5 partner countries", "NO participation fees"],
      applicationLink: "https://canva.link/ijbk-oasis",
      applicationLabel: "View infopack",
      coverImage: "https://flagcdn.com/w640/tn.png",
      coverAlt: "Tunisian flag",
    },
    {
      id: "who-am-ai",
      title: "WHO AM AI?",
      category: "Erasmus+ Youth Exchange",
      status: "Upcoming",
      statusTone: "warning",
      date: "2–10 October 2026",
      location: "Austria",
      description:
        "Exploring artificial intelligence, critical thinking, and digital responsibility together through a youth exchange focused on reflection and co-creation.",
      highlights: ["AI literacy", "Critical thinking", "Digital responsibility", "5 partner countries"],
      applicationLink: "https://canva.link/whoamai",
      applicationLabel: "View infopack",
      coverImage: "https://flagcdn.com/w640/at.png",
      coverAlt: "Austrian flag",
    },
    {
      id: "connected-not-consumed",
      title: "Connected, Not Consumed",
      category: "Erasmus+ Youth Exchange",
      status: "Upcoming",
      statusTone: "warning",
      date: "1–10 December 2026",
      location: "Germany",
      description:
        "Exploring digital well-being, media literacy, and conscious online participation together across Europe.",
      highlights: ["Digital well-being", "Media literacy", "Online participation", "7 partner countries"],
      applicationLink: "https://canva.link/ijbk-cnc",
      applicationLabel: "View infopack",
      coverImage: "https://flagcdn.com/w640/de.png",
      coverAlt: "German flag",
    },
    {
      id: "green-stage-sustainable-future",
      title: "Green Stage for Sustainable Future",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "22–31 May 2026",
      location: "Norway",
      description:
        "Climate action meets theatre: sustainability, creativity, and nature-based learning with a public showcase.",
      highlights: ["Theatre & storytelling", "Sustainability workshops", "Hikes + eco-farm visit"],
      coverImage: "https://flagcdn.com/w640/no.png",
      coverAlt: "Norwegian flag",
    },
    {
      id: "discover-eu",
      title: "Fully funded travel across Europe with DiscoverEU",
      category: "EU Travel Initiative",
      status: "Completed",
      statusTone: "success",
      date: "1 April 2026",
      location: "Europe",
      description:
        "DiscoverEU opens Europe by train. Three curated routes with leaders, Interrail passes, accommodation, food, and local transport fully covered — no participation fee.",
      highlights: ["FREE Interrail Pass", "Daily pocket money", "Cultural exchange stops", "Leaders per route"],
      applicationLink: "https://ijbkev.github.io",
      applicationLabel: "View the project results",
      coverImage: "https://flagcdn.com/w640/eu.png",
      coverAlt: "European Union flag",
    },
    {
      id: "ai-social-impact",
      title: "AI 4 Social Impact",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "5 – 12 December 2025",
      location: "Tallinn, Estonia",
      description:
        "A co-creative exchange on ethical AI, prototyping solutions for social challenges while building cross-country friendships.",
      highlights: ["Ethical AI labs", "Solution design", "Cross-country teams", "Showcase day"],
      coverImage: "https://flagcdn.com/w640/ee.png",
      coverAlt: "Estonian flag",
    },
    {
      id: "KA152",
      title: "KA152: Digitalisation Matters",
      category: "Erasmus+ Youth Exchange",
      status: "Completed",
      statusTone: "success",
      date: "2024",
      location: "Germany",
      description:
        "A digital literacy sprint covering AI tools, online safety, and collaboration to strengthen European youth skills.",
      highlights: ["Digital skills workshops", "AI tools training", "Cross-cultural teams", "Project-based learning"],
      coverImage: "https://flagcdn.com/w640/de.png",
      coverAlt: "German flag",
    },
    {
      id: "KA153",
      title: "KA153: AI Tools 4 Youth Work",
      category: "Erasmus+ Training Course",
      status: "Completed",
      statusTone: "success",
      date: "2024",
      location: "North Macedonia",
      description:
        "Upskilling youth workers with practical AI ethics, toolkits, and facilitation techniques for local programs.",
      highlights: ["AI ethics", "Practical toolkits", "Youth worker capacity building", "Open resources"],
      coverImage: "https://flagcdn.com/w640/mk.png",
      coverAlt: "North Macedonian flag",
    },
    {
      id: "ai-culinary",
      title: "AI & Culinary Journey in Türkiye",
      category: "Cultural Exchange",
      status: "Completed",
      statusTone: "success",
      date: "2025",
      location: "Türkiye",
      description:
        "Combining culinary arts with AI in the food industry — exploring culture through kitchens and code.",
      highlights: ["Cultural immersion", "AI in food", "Traditional cooking", "Tech integration"],
      coverImage: "https://flagcdn.com/w640/tr.png",
      coverAlt: "Turkish flag",
    },
    {
      id: "hiking-tours",
      title: "Sustainability Hiking Tours",
      category: "Environmental Initiative",
      status: "Ongoing",
      statusTone: "info",
      date: "2025",
      location: "Kaiserslautern Region",
      description:
        "Sustainability-focused hikes mixing outdoor activity, environmental education, and community building.",
      highlights: ["Environmental education", "Sustainable tourism", "Local partnerships", "Outdoor learning"],
      coverImage: "https://flagcdn.com/w640/de.png",
      coverAlt: "German flag",
    },
  ];
