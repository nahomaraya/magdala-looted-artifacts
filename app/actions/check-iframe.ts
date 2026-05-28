"use server";

export async function checkCanEmbed(url: string): Promise<boolean> {
  try {
    // A HEAD request is lightweight and only fetches headers, not the whole page
    const res = await fetch(url, { 
      method: 'HEAD',
      // Optional: cache the result so you aren't constantly pinging external sites
      next: { revalidate: 3600 } 
    });

    const xFrameOptions = res.headers.get('x-frame-options')?.toLowerCase();
    const csp = res.headers.get('content-security-policy')?.toLowerCase();

    // If the site explicitly denies framing or restricts it to its own origin
    if (xFrameOptions === 'deny' || xFrameOptions === 'sameorigin') {
      return false;
    }

    // If the site uses Content Security Policy to restrict framing
    if (csp?.includes('frame-ancestors')) {
      return false;
    }

    return true; // Likely safe to embed
  } catch (error) {
    // If fetch fails entirely (e.g., DNS error, server down), we can't embed it
    return false;
  }
}