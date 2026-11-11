// Parse lat/lng from a Google Maps URL (place or directions)
export function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  try {
    const m3d = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (m3d) return { lat: parseFloat(m3d[1]), lng: parseFloat(m3d[2]) };

    if (url.includes("/maps/dir/")) {
      const m1d = url.match(/!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/);
      if (m1d) return { lat: parseFloat(m1d[2]), lng: parseFloat(m1d[1]) };
    }

    // Directions / search style links: ?destination=lat,lng  ?q=lat,lng  ?ll=lat,lng
    const mq = url.match(/[?&](?:destination|q|ll|query|daddr)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i);
    if (mq) return { lat: parseFloat(mq[1]), lng: parseFloat(mq[2]) };

    const mat = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+[zm]/);
    if (mat) return { lat: parseFloat(mat[1]), lng: parseFloat(mat[2]) };
  } catch {
    // ignore parse errors
  }
  return null;
}
