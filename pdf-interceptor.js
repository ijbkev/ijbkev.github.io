// Interceptor for PDF links - add this script to all your HTML pages
// Usage: <script src="pdf-interceptor.js"></script>

(function() {
  // Intercept all links on page load
  function interceptPdfLinks() {
    document.querySelectorAll('a[href*=".pdf"], a[href*=".PDF"]').forEach(link => {
      const href = link.getAttribute('href');
      
      // Skip if already points to flipbook
      if (href.includes('ebook.html')) return;
      
      // Convert PDF link to flipbook URL
      let pdfPath = href;
      
      // Handle relative paths
      if (!pdfPath.startsWith('http')) {
        if (pdfPath.startsWith('/')) {
          pdfPath = pdfPath.substring(1); // Remove leading slash
        }
      }
      
      // Update link to open in flipbook
      link.setAttribute('href', `ebook.html?pdf=${encodeURIComponent(pdfPath)}`);
      link.setAttribute('data-flipbook-intercepted', 'true');
    });
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptPdfLinks);
  } else {
    interceptPdfLinks();
  }
  
  // Also watch for dynamically added links
  const observer = new MutationObserver(interceptPdfLinks);
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
})();
