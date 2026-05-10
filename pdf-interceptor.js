// Interceptor for PDF links - add this script to all your HTML pages
// This script intercepts PDF links and opens them in the flipbook viewer

(function() {
  'use strict';
  
  console.log('PDF Interceptor: Loading');
  
  // Get the base URL for the flipbook
  const baseUrl = window.location.origin;
  
  // Function to convert PDF path to flipbook URL
  function getPdfPath(href) {
    let pdfPath = href;
    
    // Skip if already points to flipbook
    if (pdfPath.includes('ebook.html')) return null;
    
    // Skip if it's a full HTTP URL to another domain
    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      // Only process if it's our domain
      if (!pdfPath.startsWith(baseUrl)) return null;
      // Extract just the path part
      pdfPath = new URL(pdfPath).pathname.substring(1);
    }
    
    // Handle relative paths
    if (pdfPath.startsWith('/')) {
      pdfPath = pdfPath.substring(1); // Remove leading slash for query param
    }
    
    return pdfPath;
  }
  
  // Function to get absolute flipbook URL
  function getFlipbookUrl(pdfPath) {
    return `${baseUrl}/ebook.html?pdf=${encodeURIComponent(pdfPath)}`;
  }
  
  // Intercept all links on page load and update their href
  function interceptPdfLinks() {
    let count = 0;
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Check if it's a PDF link
      if (href.toLowerCase().includes('.pdf')) {
        const pdfPath = getPdfPath(href);
        if (pdfPath) {
          const flipbookUrl = getFlipbookUrl(pdfPath);
          link.setAttribute('href', flipbookUrl);
          link.setAttribute('data-flipbook-intercepted', 'true');
          count++;
          console.log('PDF Interceptor: Changed', href, '→', flipbookUrl);
        }
      }
    });
    if (count > 0) {
      console.log(`PDF Interceptor: Found and intercepted ${count} PDF links`);
    }
  }
  
  // Also intercept clicks directly as backup
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
        console.log('PDF Interceptor: Click intercepted, navigating to', flipbookUrl);
        window.location.href = flipbookUrl;
        return false;
      }
    }
  }, true); // Use capture phase
  
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
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'A') {
              const href = node.getAttribute('href');
              if (href && href.toLowerCase().includes('.pdf')) {
                const pdfPath = getPdfPath(href);
                if (pdfPath) {
                  const flipbookUrl = getFlipbookUrl(pdfPath);
                  node.setAttribute('href', flipbookUrl);
                  console.log('PDF Interceptor: Intercepted dynamic link', href);
                }
              }
            }
            // Also check children
            node.querySelectorAll('a[href*=".pdf"], a[href*=".PDF"]').forEach(link => {
              const href = link.getAttribute('href');
              if (href) {
                const pdfPath = getPdfPath(href);
                if (pdfPath) {
                  const flipbookUrl = getFlipbookUrl(pdfPath);
                  link.setAttribute('href', flipbookUrl);
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
  
  console.log('PDF Interceptor: Ready');
})();
