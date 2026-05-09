// Interceptor for PDF links - add this script to all your HTML pages
// This script intercepts PDF links and opens them in the flipbook viewer

(function() {
  'use strict';
  
  // Function to convert PDF path to flipbook URL
  function getPdfPath(href) {
    let pdfPath = href;
    
    // Skip if already points to flipbook
    if (pdfPath.includes('ebook.html')) return null;
    
    // Handle absolute URLs (skip them - only intercept relative/site PDFs)
    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      return null;
    }
    
    // Handle relative paths
    if (pdfPath.startsWith('/')) {
      pdfPath = pdfPath.substring(1); // Remove leading slash for query param
    }
    
    return pdfPath;
  }
  
  // Function to get flipbook URL
  function getFlipbookUrl(pdfPath) {
    return `ebook.html?pdf=${encodeURIComponent(pdfPath)}`;
  }
  
  // Intercept all links on page load and update their href
  function interceptPdfLinks() {
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Check if it's a PDF link
      if (href.toLowerCase().includes('.pdf')) {
        const pdfPath = getPdfPath(href);
        if (pdfPath) {
          link.setAttribute('href', getFlipbookUrl(pdfPath));
          link.setAttribute('data-flipbook-intercepted', 'true');
          console.log('Intercepted PDF link:', href, '->', getFlipbookUrl(pdfPath));
        }
      }
    });
  }
  
  // Also intercept clicks directly (in case href modification doesn't work)
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href*=".pdf"], a[href*=".PDF"]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (href && !href.includes('ebook.html')) {
      const pdfPath = getPdfPath(href);
      if (pdfPath) {
        e.preventDefault();
        e.stopPropagation();
        const flipbookUrl = getFlipbookUrl(pdfPath);
        console.log('Intercepted PDF click:', href, '->', flipbookUrl);
        window.location.href = flipbookUrl;
        return false;
      }
    }
  }, true); // Use capture phase to catch events before they bubble
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptPdfLinks);
  } else {
    interceptPdfLinks();
  }
  
  // Watch for dynamically added links
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        // Check newly added links
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'A') {
              const href = node.getAttribute('href');
              if (href && href.toLowerCase().includes('.pdf')) {
                const pdfPath = getPdfPath(href);
                if (pdfPath) {
                  node.setAttribute('href', getFlipbookUrl(pdfPath));
                }
              }
            }
            // Also check children
            node.querySelectorAll('a[href*=".pdf"], a[href*=".PDF"]').forEach(link => {
              const href = link.getAttribute('href');
              if (href) {
                const pdfPath = getPdfPath(href);
                if (pdfPath) {
                  link.setAttribute('href', getFlipbookUrl(pdfPath));
                }
              }
            });
          }
        });
      }
    });
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  console.log('PDF interceptor loaded - all PDF links will open in flipbook');
})();
