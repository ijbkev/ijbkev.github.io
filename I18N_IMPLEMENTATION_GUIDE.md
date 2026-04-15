# German Language Implementation Guide

## ✅ What's Already Set Up

Your website now has a complete i18n (internationalization) infrastructure with:

- **Language-aware routing**: URLs automatically include `/en/` and `/de/` prefixes
- **Translation files**: JSON files for English and German
- **Language switcher**: Button in navigation to toggle between languages
- **i18n provider**: React i18next integration initialized in App.tsx

## 📍 URL Structure

- English: `example.com/en` → `example.com/en/about`, `example.com/en/blog`, etc.
- German: `example.com/de` → `example.com/de/about`, `example.com/de/blog`, etc.
- Root `/` redirects to `/en` by default

When users click the language switcher, they stay on the same page but in a different language.

## 🎯 How to Update Page Components

### Step 1: Import the translation hook

```tsx
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const YourPage = () => {
  const { t } = useTranslation();
  const { lang = "en" } = useParams<{ lang?: string }>();
  
  // Your component code...
};
```

### Step 2: Replace hardcoded English text with translation keys

**Before:**
```tsx
<h1>About Us</h1>
<p>Welcome to our organization</p>
```

**After:**
```tsx
<h1>{t("about.title")}</h1>
<p>{t("about.welcome")}</p>
```

### Step 3: Add translations to JSON files

Edit `src/i18n/locales/en.json` and `src/i18n/locales/de.json`:

```json
{
  "about": {
    "title": "About Us",
    "welcome": "Welcome to our organization"
  }
}
```

```json
{
  "about": {
    "title": "Über uns",
    "welcome": "Willkommen in unserer Organisation"
  }
}
```

### Step 4: Update internal links to include language prefix

**Before:**
```tsx
<Link to="/about">About</Link>
```

**After:**
```tsx
<Link to={`/${lang}/about`}>{t("common.about")}</Link>
```

## 📄 Files Created/Modified

### New Files:
- `src/i18n/config.ts` - i18n configuration
- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/de.json` - German translations
- `src/components/LanguageSwitcher.tsx` - Language toggle button

### Updated Files:
- `src/App.tsx` - Added i18n provider and language-aware routing
- `src/main.tsx` - Initialize i18n before app render
- `src/components/Navigation.tsx` - Uses translations and language switcher
- `package.json` - Added i18next dependencies

## 🚀 Example: Full Timeline of Translating a Page

See [Homepage-Translation-Example.tsx](./HOMEPAGE_EXAMPLE.md) for a complete before/after example.

## 📝 Translation Key Structure

Organization keys by page/feature for easy management:

```
common:          General terms (home, about, contact)
header:          Header/navigation items
homepage:        Homepage specific content
about:           About page content
footer:          Footer content
languageSwitcher: Language toggle text
```

## ⚡ Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production
npm preview
```

## 🔗 Important Notes

1. **Language parameter**: All components now receive `lang` from URL params
2. **Persistent language selection**: User's language choice is saved in localStorage
3. **Fallback language**: English is the fallback if a translation is missing
4. **No locale files needed**: JSON translations are sufficient

## Next Steps

1. Update remaining pages (About, Blog, Contact, Team, etc.)
2. Add more translations to the JSON files
3. Test all pages with both languages
4. Deploy to your server

All rotations are already set up and will work automatically with the language switcher!
