// Service Worker - Intercepts all PDF requests and opens them in the flipbook viewer
const FLIPBOOK_URL = '/ebook.html';

// Activate the service worker
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Intercept all requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Check if the request is for a PDF file
  if (url.pathname.endsWith('.pdf')) {
    // Get the PDF path relative to the site root
    const pdfPath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    
    // Redirect to flipbook with PDF as query parameter
    const flipbookUrl = new URL(`${FLIPBOOK_URL}?pdf=${encodeURIComponent(pdfPath)}`, self.location.origin);
    
    // Return a redirect response
    event.respondWith(
      new Response(null, {
        status: 302,
        statusText: 'Found',
        headers: {
          'Location': flipbookUrl.toString()
        }
      })
    );
    return;
  }
  
  // For all other requests, use default fetch
  event.respondWith(fetch(event.request));
});
