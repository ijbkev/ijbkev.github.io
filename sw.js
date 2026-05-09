// Service Worker - Intercepts all PDF requests and opens them in the flipbook viewer
const FLIPBOOK_URL = '/ebook.html';

// Activate the service worker and claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('Service Worker activated and claimed all clients');
    })
  );
});

// Intercept all requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Check if the request is for a PDF file
  if (url.pathname.endsWith('.pdf') || url.pathname.endsWith('.PDF')) {
    // Get the PDF path relative to the site root
    let pdfPath = url.pathname;
    if (pdfPath.startsWith('/')) {
      pdfPath = pdfPath.substring(1); // Remove leading slash
    }
    
    // Redirect to flipbook with PDF as query parameter
    const flipbookUrl = `${FLIPBOOK_URL}?pdf=${encodeURIComponent(pdfPath)}`;
    
    console.log(`Intercepting PDF: ${url.pathname} -> ${flipbookUrl}`);
    
    // Return a redirect response
    event.respondWith(
      new Response(null, {
        status: 302,
        statusText: 'Found',
        headers: new Headers({
          'Location': flipbookUrl
        })
      })
    );
    return;
  }
  
  // For all other requests, use default fetch
  event.respondWith(fetch(event.request));
});
