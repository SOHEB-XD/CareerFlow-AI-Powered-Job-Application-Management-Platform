import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

/**
 * Retrieves the date of the most recent significant landing-page content update.
 * Checks git commit history first so that build dates are not falsely reported as content changes.
 * Falls back to file modification time if git is unavailable.
 */
function getLandingContentLastMod() {
  const landingFilePath = path.resolve(__dirname, '../src/pages/Landing.jsx');
  try {
    const gitDate = execSync(`git log -1 --format="%cs" "${landingFilePath}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(gitDate)) {
      return gitDate;
    }
  } catch {
    // Git not available or not in a repo context
  }

  try {
    if (fs.existsSync(landingFilePath)) {
      return fs.statSync(landingFilePath).mtime.toISOString().split('T')[0];
    }
  } catch {
    // Fallback if stat fails
  }

  return null;
}

function generateSitemap() {
  const siteUrl = process.env.VITE_SITE_URL?.trim();
  const robotsPath = path.join(distDir, 'robots.txt');

  if (!siteUrl || !/^https?:\/\//i.test(siteUrl)) {
    console.log('[Sitemap Notice]: VITE_SITE_URL is not set or not a valid HTTP(S) URL.');
    console.log('[Sitemap Notice]: Skipping sitemap.xml generation to prevent publishing fabricated or placeholder URLs.');
    console.log('[Sitemap Notice]: When your production domain is chosen, deploy with VITE_SITE_URL=https://yourdomain.com to generate sitemap.xml.');

    // Ensure any stale sitemap in dist is cleaned up
    const sitemapPath = path.join(distDir, 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
      fs.unlinkSync(sitemapPath);
    }

    // Ensure no stale Sitemap directive remains in robots.txt when URL is absent
    if (fs.existsSync(robotsPath)) {
      const robotsContent = fs.readFileSync(robotsPath, 'utf8');
      if (robotsContent.includes('Sitemap:')) {
        const cleanedRobots = robotsContent
          .replace(/\n*#\s*Sitemap\s*\nSitemap:[^\n]*/gi, '')
          .replace(/\n*Sitemap:[^\n]*/gi, '')
          .trimEnd() + '\n';
        fs.writeFileSync(robotsPath, cleanedRobots, 'utf8');
      }
    }
    return;
  }

  if (!fs.existsSync(distDir)) {
    console.warn('[Sitemap Notice]: dist directory does not exist yet. Run vite build before generating sitemap.');
    return;
  }

  const cleanUrl = siteUrl.replace(/\/+$/, '');
  const contentLastMod = getLandingContentLastMod();

  // Only the public landing page is indexable.
  // changefreq and priority are omitted as modern search engines (including Google) ignore them.
  // lastmod is only included when backed by verifiable content modification date.
  const lastmodTag = contentLastMod ? `\n    <lastmod>${contentLastMod}</lastmod>` : '';
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${cleanUrl}/</loc>${lastmodTag}
  </url>
</urlset>
`;

  const sitemapPath = path.join(distDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
  console.log(`[Sitemap Success]: Generated truthful sitemap.xml for ${cleanUrl}/ (lastmod: ${contentLastMod || 'omitted'})`);

  // Synchronize Sitemap directive in dist/robots.txt
  if (fs.existsSync(robotsPath)) {
    let robotsContent = fs.readFileSync(robotsPath, 'utf8');
    // Remove any existing Sitemap line first to keep it cleanly synchronized
    robotsContent = robotsContent
      .replace(/\n*#\s*Sitemap\s*\nSitemap:[^\n]*/gi, '')
      .replace(/\n*Sitemap:[^\n]*/gi, '')
      .trimEnd();

    robotsContent += `\n\n# Sitemap\nSitemap: ${cleanUrl}/sitemap.xml\n`;
    fs.writeFileSync(robotsPath, robotsContent, 'utf8');
    console.log(`[Sitemap Success]: Synchronized Sitemap directive in dist/robots.txt`);
  }
}

generateSitemap();
