"use client";

export function handleTokenFromURL() {
  if (typeof window !== 'undefined') {
    // Check for token in URL (for Google OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      console.log('Token found in URL');
      localStorage.setItem('token', tokenFromUrl);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  }
  return false;
}
