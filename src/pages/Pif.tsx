import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  History,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import MapHeroAccent from "@/components/MapHeroAccent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Field = { label: string; value: string; href?: string };

const organisationFields: Field[] = [
  { label: "Organisation", value: "Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. (IJBK e.V.)" },
  { label: "Country", value: "Germany" },
  { label: "City", value: "Kaiserslautern" },
  { label: "Address", value: "Werderstraße 8, 67655 Kaiserslautern, Deutschland" },
  { label: "Region", value: "Rhineland-Palatinate" },
];

const contactFields: Field[] = [
  { label: "Website", value: "http://www.ijbk-de.org/", href: "http://www.ijbk-de.org/" },
  { label: "Email", value: "office@ijbk-de.org", href: "mailto:office@ijbk-de.org" },
  { label: "Telephone", value: "+49 15253482040", href: "tel:+4915253482040" },
];

const legalFields: Field[] = [
  { label: "OID", value: "E10404746" },
  { label: "Registration Number", value: "VR 31177 (Kaiserslautern district court)" },
  { label: "Tax Status", value: "Non-profit association" },
  { label: "Type of Organisation", value: "Non-governmental organisation | Eingetragener Verein – e.V." },
  { label: "Public body", value: "No" },
  { label: "Non-profit", value: "Yes" },
];

const primaryContact: Field[] = [
  { label: "Title", value: "Mr" },
  { label: "Position", value: "Chairman / Legal Representative" },
  { label: "First name", value: "Vidit" },
  { label: "Last name", value: "Goyal" },
  { label: "Telephone", value: "+49 157 58060612", href: "tel:+4915758060612" },
  { label: "Email", value: "vidit@ijbk-de.org", href: "mailto:vidit@ijbk-de.org" },
];

const secondaryContact: Field[] = [
  { label: "Title", value: "Mr" },
  { label: "Position", value: "Deputy Chairman" },
  { label: "First name", value: "Rohit Singh" },
  { label: "Last name", value: "Negi" },
  { label: "Telephone", value: "+49 1523 8245365", href: "tel:+4915238245365" },
  { label: "Email", value: "rohit@ijbk-de.org", href: "mailto:rohit@ijbk-de.org" },
];

const presentation = `Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. (IJBK e.V.) is a registered youth association located in Kaiserslautern, Germany. The organisation is a non-profit association (gemeinnütziger eingetragener Verein). IJBK e.V. developed from the long-standing work of the Studentisches Netzwerk der RPTU (OID: E10322231), a youth-led and student-driven initiative at the Rheinland-Pfälzische Technische Universität. After several years of running Erasmus+ projects and local youth actions informally, the group transitioned into a legal association to ensure continuity, strengthen its administrative framework, and expand its capacity to participate in and coordinate Erasmus+ projects at European level.

The association pursues youth empowerment through non-formal education with a particular emphasis on equipping young people with practical competences for the future. Core areas include digital skills, Artificial Intelligence (AI) awareness, intercultural learning, sustainability, social entrepreneurship, arts and culture, and civic engagement. By integrating these themes into workshops, youth exchanges, and training courses, IJBK e.V. supports young people in building both professional and personal competences that align with EU youth priorities.

At the local level, IJBK e.V. actively cooperates with student networks and local associations in Kaiserslautern. Examples include hiking and well-being activities organised together with ESN Kaiserslautern, where international and German youth come together to promote sustainable lifestyles, intercultural dialogue, and inclusion. Locally, the organisation also facilitates small workshops on digital literacy, community building, and resilience skills, encouraging active participation of both students and school pupils.

At the international level, IJBK e.V. is engaged in Erasmus+ Youth Exchanges and Training Courses, preparing and sending participants abroad while also contributing to project design and dissemination.

Organisationally, IJBK e.V. is led by a team of motivated young professionals and students with backgrounds in artificial intelligence, data science, social sciences, psychology, and community organising. Together, they bring complementary expertise in project coordination, logistics, finance, digital dissemination, and non-formal education methods. This multidisciplinary team ensures that projects are implemented with both technical knowledge and strong youth work values.

Through its statutes, IJBK e.V. commits itself to advancing public-benefit purposes, including youth and educational support, international understanding, environmental education, culture and sports promotion, and civic responsibility. Its activities are implemented in a transparent, inclusive, and participatory manner, reflecting its belief that young people should not only be beneficiaries but also co-creators of learning opportunities.`;

const youthWork = `Regular youth work activities at local level:

1. Non-formal education & community-based actions

IJBK e.V. organises local workshops, hikes, and well-being activities in cooperation with student networks in Kaiserslautern. These activities foster sustainability awareness, social inclusion, and intercultural community-building among international and local young people through participatory and non-formal learning methods.

2. Digital and AI-related youth work

The association implements introductory activities focused on digital literacy and the practical use of Artificial Intelligence tools for young people and youth workers. These activities aim to build basic understanding, critical awareness, and responsible use of digital technologies in everyday life and youth work contexts.

Founding date: 08 July 2025

Scope of activities:

Youth education with a focus on digital skills and AI awareness, inclusion, sustainability, arts and culture, sports, civic engagement, international understanding, and European youth awareness.

Implementation formats:

Workshops, youth exchanges, training courses, partner-based projects, local community actions, and digital dissemination activities.`;

const teamMembers = [
  { name: "Vidit Goyal", role: "Chairman / Legal Representative", text: "Background in Artificial Intelligence and Data Science, with experience in non-formal education design, project coordination, and international partner relations. Holds a diploma in Nutrition and Conflict Management.\n\nResponsibilities: Strategic leadership, quality assurance, legal and financial oversight, and partner communication." },
  { name: "Rohit Singh Negi", role: "Deputy Chairman", text: "Background in Software and Information Technology.\n\nResponsibilities: Project planning in coordination with the Chair, oversight of implementation, documentation management, and support with participant reimbursements and reporting." },
  { name: "Om Tiwari", role: "Primary Founding Member", text: "Background in Data Science with active involvement in student organisations. Strong interest in sustainability and social justice. Experienced in social media communication and public relations within youth-led initiatives." },
  { name: "Marta Rudzate", role: "Founding Member", text: "Background in Mathematics and Statistics (University of Latvia), with an academic exchange at RPTU. Active ESN volunteer, contributing to music sessions and meditation practices. Holder of multiple Youthpass certificates, with engagement in climate action and peace movements." },
  { name: "Tamara Šuniarová", role: "Founding Member", text: "Background in Psychology and experienced youth worker involved in Erasmus+ project co-creation. Experience includes refugee support and English language teaching. Expertise areas include sports-based learning, mindfulness, acro yoga, and partner acrobatics. Has participated in and delivered Erasmus+ projects focusing on well-being and sustainability." },
  { name: "Prateek Kumar Sharma", role: "Founding Member", text: "Master’s student in Computer Science at RPTU. Professional experience as a Research Assistant at DFKI and as a Software Engineer in Data Science. Expertise includes Artificial Intelligence, Machine Learning, Natural Language Processing, Computer Vision, and software development. Actively involved in Erasmus+ projects, youth work, and technical knowledge-sharing through blogging." },
  { name: "Yeliena Bemeshchuk", role: "Founding Member", text: "Experience in logistics coordination and operational support. Actively engaged in Erasmus+ youth projects and intercultural activities, contributing to smooth implementation and participant support." },
];

const staffAnswerIntro = `Regular youth work activities at local level:

1. Non-formal education & community-based actions

IJBK e.V. organises local workshops, hikes, and well-being activities in cooperation with student networks in Kaiserslautern. These activities foster sustainability awareness, social inclusion, and intercultural community-building among international and local young people through participatory and non-formal learning methods.

Management and core team:`;

const staffAnswer = `${staffAnswerIntro}\n\n${teamMembers.map((member, index) => `${index + 1}. ${member.name} — ${member.role}\n\n${member.text}`).join("\n\n")}`;

const participation = [
  { project: "Participation — Entrepreneurship, marketing & AI youth exchange (Serbia); Volunteering at the European Universities Games (Poland); Mapping old fruit varieties (Slovakia); Training course on project design for European Solidarity Corps (France); Belgian exchange on European Green Deal / creative reuse (Belgium); Youth Exchange on LGBTQIA+ rights (Spain).", years: "2022–2025", country: "Serbia; Poland; Slovakia; France; Belgium; Spain; India; Germany", role: "Participant", notes: "Broad Erasmus+ and non-formal learning participation focused on entrepreneurship, digital skills, sustainability, inclusion, and intercultural exchange." },
  { project: "Act It Out! — Training Course", years: "2023", country: "Hungary", role: "Partner", notes: "Delivered non-formal theatre-based methods and facilitation as project partner." },
  { project: "KA153 — “AI Tools 4 Youth Work”", years: "2023–2024", country: "North Macedonia", role: "Organiser", notes: "Led organisation and content on applying AI tools in youth work (training course)." },
  { project: "KA152 — “Digitalisation Matters”", years: "2023–2024", country: "Germany", role: "Organiser", notes: "Local youth exchange/training focusing on digital transformation and digital skills for youth." },
  { project: "Act It Out! — P2 Training Course", years: "2025", country: "Hungary", role: "Partner", notes: "Continued partnership for follow-up theatre and youth training activities." },
  { project: "Youth Empowerment for Resilient Communities—Training Course", years: "2025", country: "Slovakia", role: "Partner", notes: "Partnership role delivering youth empowerment & leadership training." },
  { project: "AI 4 Social Impact", years: "2025", country: "Estonia", role: "Partner", notes: "Accreditation project by Eesti Noorteühenduste Liit" },
  { project: "Art Against Hate Speech", years: "2025", country: "Luxembourg", role: "Partner", notes: "2025-1-LU01-KA152-YOU-000297831" },
  { project: "DiscoverEU Memories Journal", years: "2026", country: "Germany", role: "Coordinator", notes: "2025-2-DE04-KA155-YOU-000369746" },
  { project: "Green Stage for Sustainable Future", years: "2026", country: "Norway", role: "Coordinator", notes: "2025-3-DE04-KA152-YOU-000371562" },
  { project: "ONLINE AWARENESS & SAFETY IN SOCIETY", years: "2026", country: "Tunisia", role: "Coordinator", notes: "2026-1-DE04-KA152-YOU-000392502" },
  { project: "WHO AM AI?", years: "2026", country: "Austria", role: "Coordinator", notes: "2026-1-DE04-KA152-YOU-000400288" },
  { project: "CONNECTED, NOT CONSUMED", years: "2026", country: "Germany", role: "Coordinator", notes: "2026-1-DE04-KA152-YOU-000393739" },
];

const CopyButton = ({ value, label = "Copy" }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0 gap-2 bg-white/80" aria-label={`${label} to clipboard`}>
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? "Copied" : label}</span>
    </Button>
  );
};

const FieldGrid = ({ fields }: { fields: Field[] }) => (
  <div className="grid gap-3">
    {fields.map((field) => (
      <div key={field.label} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{field.label}</p>
          {field.href ? (
            <a href={field.href} target={field.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-1 inline-flex break-all font-medium text-primary hover:underline">
              {field.value}
            </a>
          ) : <p className="mt-1 break-words font-medium text-slate-900">{field.value}</p>}
        </div>
        <CopyButton value={field.value} />
      </div>
    ))}
  </div>
);

const AnswerCard = ({ number, title, text }: { number: string; title: string; text: string }) => (
  <Card className="panel-strong overflow-hidden">
    <CardContent className="p-0">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-6">
        <div className="flex gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">{number}</span>
          <h3 className="pt-1 text-lg font-semibold leading-snug text-slate-950">{title}</h3>
        </div>
        <CopyButton value={text} label="Copy answer" />
      </div>
      <div className="whitespace-pre-line p-4 text-[0.98rem] leading-7 text-slate-700 sm:p-6">{text}</div>
    </CardContent>
  </Card>
);

const Pif = () => {
  const participationTable = [
    ["Project / Activity", "Year(s)", "Country / Countries", "Role / Involvement", "Notes"],
    ...participation.map((item) => [item.project, item.years, item.country, item.role, item.notes]),
  ].map((row) => row.join("\t")).join("\n");

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <section className="map-page-hero relative overflow-hidden text-white">
        <MapHeroAccent subtle />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="page-shell relative py-8 sm:py-10 lg:py-12">
          <Button asChild variant="ghost" className="mb-4 -ml-3 text-white/80 hover:bg-white/10 hover:text-white">
            <Link to="/contact"><ArrowLeft className="mr-2 h-4 w-4" />Back to contact</Link>
          </Button>
          <div className="max-w-4xl">
            <Badge className="mb-3 border-cyan-200/30 bg-cyan-300/15 text-cyan-50"><Sparkles className="mr-2 h-4 w-4" />Official organisation profile</Badge>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Erasmus+ Partner Identification Form</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">Every detail partners need about IJBK e.V., organised for quick reference and direct copy-paste into an application.</p>
          </div>
        </div>
      </section>

      <main className="page-shell py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft" aria-label="PIF sections">
              <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">On this page</p>
              {[['organisation','Organisation'],['contacts','Contacts'],['legal','Legal status'],['people','Associated persons'],['experience','Background & experience'],['participation','Past participation']].map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-primary/5 hover:text-primary">{label}</a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-10">
            <section id="organisation" className="scroll-mt-28">
              <div className="mb-4 flex items-center gap-3"><Building2 className="h-6 w-6 text-primary" /><h2 className="text-2xl font-semibold">Organisation & location</h2></div>
              <Card className="panel-strong"><CardContent className="p-4 sm:p-6"><FieldGrid fields={organisationFields} /></CardContent></Card>
            </section>

            <section id="contacts" className="scroll-mt-28">
              <div className="mb-4 flex items-center gap-3"><Mail className="h-6 w-6 text-primary" /><h2 className="text-2xl font-semibold">Contact information</h2></div>
              <Card className="panel-strong"><CardContent className="p-4 sm:p-6"><FieldGrid fields={contactFields} /></CardContent></Card>
            </section>

            <section id="legal" className="scroll-mt-28">
              <div className="mb-4 flex items-center gap-3"><Clipboard className="h-6 w-6 text-primary" /><h2 className="text-2xl font-semibold">Legal status & classification</h2></div>
              <Card className="panel-strong"><CardContent className="p-4 sm:p-6"><FieldGrid fields={legalFields} /></CardContent></Card>
            </section>

            <section id="people" className="scroll-mt-28">
              <div className="mb-4 flex items-center gap-3"><Users className="h-6 w-6 text-primary" /><h2 className="text-2xl font-semibold">Associated persons</h2></div>
              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="panel-strong"><CardContent className="p-4 sm:p-6"><h3 className="mb-4 text-lg font-semibold">Legal Representative & Primary Contact</h3><FieldGrid fields={primaryContact} /></CardContent></Card>
                <Card className="panel-strong"><CardContent className="p-4 sm:p-6"><h3 className="mb-4 text-lg font-semibold">Secondary Contact Person</h3><FieldGrid fields={secondaryContact} /></CardContent></Card>
              </div>
            </section>

            <section id="experience" className="scroll-mt-28 space-y-5">
              <div className="mb-4 flex items-center gap-3"><Sparkles className="h-6 w-6 text-primary" /><h2 className="text-2xl font-semibold">Background and experience</h2></div>
              <AnswerCard number="1" title="Brief presentation of the organisation" text={presentation} />
              <AnswerCard number="2" title="What are the activities and experience of the organisation in youth work? Please provide information on your organisation’s / group’s regular youth work activities." text={youthWork} />
              <AnswerCard number="3" title="Please give information on the key staff/persons involved in this application and on the competences and previous experience that they will bring to the project." text={staffAnswer} />
            </section>

            <section id="participation" className="scroll-mt-28">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><History className="h-6 w-6 text-primary" /><h2 className="text-2xl font-semibold">Past participation <span className="text-base font-normal text-muted-foreground">(summary)</span></h2></div>
                <CopyButton value={participationTable} label="Copy table" />
              </div>
              <Card className="panel-strong overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-blue-950 text-white">
                      <tr>
                        {['Project / Activity', 'Year(s)', 'Country / Countries', 'Role / Involvement', 'Notes'].map((heading) => (
                          <th key={heading} className="border-r border-white/15 px-4 py-4 font-semibold last:border-r-0">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participation.map((item, index) => (
                        <tr key={item.project} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="w-[32%] border-r border-t border-slate-200 px-4 py-4 align-top font-semibold text-slate-950">{item.project}</td>
                          <td className="whitespace-nowrap border-r border-t border-slate-200 px-4 py-4 align-top">{item.years}</td>
                          <td className="w-[16%] border-r border-t border-slate-200 px-4 py-4 align-top">{item.country}</td>
                          <td className="whitespace-nowrap border-r border-t border-slate-200 px-4 py-4 align-top font-medium text-primary">{item.role}</td>
                          <td className="w-[24%] border-t border-slate-200 px-4 py-4 align-top leading-6 text-slate-700">{item.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:hidden">Swipe horizontally to view all columns.</div>
              </Card>
            </section>

            <Card className="border-0 bg-gradient-to-br from-blue-950 to-blue-800 text-white shadow-strong">
              <CardContent className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                <div><h2 className="text-2xl font-semibold">Ready to collaborate?</h2><p className="mt-2 text-white/70">Use these details in your application or get in touch with our team.</p></div>
                <Button asChild className="bg-white text-blue-950 hover:bg-cyan-50"><Link to="/contact">Contact IJBK e.V.<ExternalLink className="ml-2 h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pif;
