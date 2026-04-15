# Updating Homepage as an Example

This shows how to update any page to support both English and German with i18n.

## Step 1: Update the imports

Add `useTranslation` and `useParams`:

```tsx
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
```

## Step 2: Add to component declaration

```tsx
const Homepage = () => {
  const { t } = useTranslation();
  const { lang = "en" } = useParams<{ lang?: string }>();
  
  // rest of component...
};
```

## Step 3: Replace hardcoded strings

### Hero Section - Before:
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm font-semibold">
  Erasmus+ powered NGO <ShieldCheck className="w-4 h-4" />
</div>

<h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight max-w-3xl">
  Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.
</h1>
<p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl">
  We design high-energy learning journeys where youth,
  technology, and sustainability meet — co-funded by the
  European Union.
</p>
```

### Hero Section - After:
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm font-semibold">
  {t("common.home")} <ShieldCheck className="w-4 h-4" />
</div>

<h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight max-w-3xl">
  {t("header.orgName")}
</h1>
<p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl">
  {t("homepage.hero.subtitle")}
</p>
```

## Step 4: Update Links

### Before:
```tsx
<Button asChild size="lg" className="bg-white text-slate-900 hover:-translate-y-0.5 transition-transform">
  <Link to="/about">
    Learn about IJBK
    <ArrowRight className="ml-2 h-4 w-4" />
  </Link>
</Button>
<Button asChild size="lg" variant="outline" className="border-white/60 text-white bg-transparent hover:bg-white/10">
  <Link to="/projects">See projects</Link>
</Button>
<Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
  <Link to="/join">
    Partner with us
    <ArrowUpRight className="ml-2 h-4 w-4" />
  </Link>
</Button>
```

### After:
```tsx
<Button asChild size="lg" className="bg-white text-slate-900 hover:-translate-y-0.5 transition-transform">
  <Link to={`/${lang}/about`}>
    {t("common.about")}
    <ArrowRight className="ml-2 h-4 w-4" />
  </Link>
</Button>
<Button asChild size="lg" variant="outline" className="border-white/60 text-white bg-transparent hover:bg-white/10">
  <Link to={`/${lang}/projects`}>{t("common.projects")}</Link>
</Button>
<Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
  <Link to={`/${lang}/join`}>
    {t("common.partnership")}
    <ArrowUpRight className="ml-2 h-4 w-4" />
  </Link>
</Button>
```

## Step 5: Update Mission Areas (Dynamic Lists)

### Before:
```tsx
const missionAreas = useMemo(
  () => [
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: "Digital Skills & AI",
      description: "Immersive training, ethical AI literacy, and hands-on tech for future-ready youth.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Social Entrepreneurship",
      description: "Building ventures that tackle real community challenges with measurable impact.",
    },
    // ...
  ],
  []
);
```

### After:
```tsx
const missionAreas = useMemo(
  () => [
    {
      icon: <Lightbulb className="w-7 h-7" />,
      title: t("about.missionAreas.digitalSkills.title"),
      description: t("about.missionAreas.digitalSkills.description"),
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: t("about.missionAreas.entrepreneurship.title"),
      description: t("about.missionAreas.entrepreneurship.description"),
    },
    // ...
  ],
  [t] // Add 't' to dependencies so it updates on language change
);
```

## Translation Keys to Add

Add these to both `en.json` and `de.json`:

```json
{
  "homepage": {
    "hero": {
      "title": "Youth-led innovation for digital, intercultural, and sustainable futures",
      "subtitle": "Erasmus+, AI labs, social entrepreneurship, and exchange experiences — all designed by young people, for young people.",
      "cta": "Join our next cohort"
    },
    "stats": {
      "founded": "Founded",
      "missionAreas": "Mission areas",
      "countriesReached": "Countries reached",
      "nonProfit": "Non-profit"
    }
  }
}
```

## Important Notes

1. **Always include `t` in useMemo dependencies** when using translations
2. **Language parameter in useParams**: Use `{ lang = "en" }` for type safety
3. **Links must include language prefix**: `/${lang}/page` not just `/page`
4. **Persist language choice**: The switcher automatically saves to localStorage

## Pages Left to Update

- [ ] About.tsx
- [ ] Blog.tsx
- [ ] Contact.tsx
- [ ] ErasmusPlus.tsx
- [ ] Projects.tsx
- [ ] Team.tsx
- [ ] Join.tsx
- [ ] Footer.tsx

Each follows the same pattern!
