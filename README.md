# DiscoverEU Memories Journal

This repository hosts the online DiscoverEU Memories Journal for the project journey that took place from **4 to 23 April 2026**.

The website contains memory walls for each group. Each group page includes participant journals, city videos, and photo memories from the journey.

## Live Pages

```text
https://ijbkev.github.io/
```

## 🎯 Auto-Opening PDFs with Flipbook (Setup Required)

All PDFs on your site will automatically open in an interactive flipbook viewer. **Here's how to set it up:**

### Step 1: Add the Interceptor Script to Every HTML Page

Add this single line to the `<head>` section of every HTML page (`about.html`, `group1.html`, `group2.html`, etc.):

```html
<script src="pdf-interceptor.js"></script>
```

**Example:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <script src="pdf-interceptor.js"></script>
  <!-- Your other scripts and styles -->
</head>
<body>
  <!-- Your content with PDF links like: -->
  <a href="assets1/journals/myfile.pdf">View Journal</a>
</body>
</html>
```

### Step 2: That's It! 🎉

Now whenever anyone clicks a PDF link on your site, it automatically opens in the flipbook viewer with:
- ✨ Smooth page flip animation
- ⌨️ Keyboard navigation (arrow keys)
- 🔍 Zoom controls
- 🔊 Page flip sounds
- 💻 Responsive design (mobile, tablet, desktop)
- ⛔ Fullscreen mode

### How It Works

- **`sw.js`** - Service worker that intercepts PDF requests at the network level
- **`pdf-interceptor.js`** - Script that modifies PDF links on your pages to open in the flipbook
- **`ebook.html`** - The flipbook viewer itself

Users won't see any difference in your page links - they just work, and PDFs open beautifully! 📚

## Google Drive PDFs

For large PDFs that should stay on Google Drive, use the Drive file ID:

```text
ebook.html?drive=GOOGLE_DRIVE_FILE_ID
```

Because the flipbook has to read the PDF bytes in the browser, Drive links need the Google Drive API media endpoint. Create a browser API key in Google Cloud, enable the Google Drive API, restrict the key to `https://ijbkev.github.io/*`, then paste it into `DRIVE_API_KEY` in `ebook.html`.

The Collective Booklet button already points to:

```text
ebook.html?drive=1cwOC8g5UUEvrSmc2zo4HmHlJWT90QBpw
```

If `DRIVE_API_KEY` is empty or the API request is blocked, the page falls back to the public Google Drive preview link.
