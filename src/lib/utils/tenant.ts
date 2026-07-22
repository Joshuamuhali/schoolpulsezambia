/**
 * Utility for tenant (subdomain) resolution.
 */

export function getSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // Ignore localhost and common platform domains
  const ignoredDomains = ["localhost", "schoolpulse.com", "school-pulse.vercel.app"];
  
  if (ignoredDomains.includes(hostname)) {
    return null;
  }

  // Example: school1.schoolpulse.com -> school1
  // Example: school1.localhost -> school1
  const parts = hostname.split(".");
  if (parts.length > 1) {
    return parts[0];
  }

  return null;
}

export function isMainPlatform(): boolean {
  return getSubdomain() === null;
}
