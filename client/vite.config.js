import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Custom Vite plugin to inject canonical URL and OpenGraph URL metadata
 * strictly when a production site URL (VITE_SITE_URL) is explicitly configured.
 * When VITE_SITE_URL is omitted (local dev or unassigned domain), no placeholder
 * or fabricated canonical tags are emitted.
 */
function seoUrlPlugin() {
  return {
    name: 'seo-url-transform',
    transformIndexHtml(html) {
      const siteUrl = process.env.VITE_SITE_URL?.trim();
      if (siteUrl && /^https?:\/\//i.test(siteUrl)) {
        const cleanUrl = siteUrl.replace(/\/+$/, '');
        const canonicalTag = `    <link rel="canonical" href="${cleanUrl}/" />\n`;
        const ogUrlTag = `    <meta property="og:url" content="${cleanUrl}/" />\n`;

        // Inject canonical and og:url before </head>
        let modifiedHtml = html.replace(
          '</head>',
          `${canonicalTag}${ogUrlTag}  </head>`
        );

        // Inject "url" property into JSON-LD
        modifiedHtml = modifiedHtml.replace(
          '"@type": "WebApplication",',
          `"@type": "WebApplication",\n      "url": "${cleanUrl}/",`
        );

        // Update relative social image URLs to absolute HTTPS URLs
        modifiedHtml = modifiedHtml
          .replace(
            '<meta property="og:image" content="/videos/careerflow-spiral-poster.jpg" />',
            `<meta property="og:image" content="${cleanUrl}/videos/careerflow-spiral-poster.jpg" />`
          )
          .replace(
            '<meta name="twitter:image" content="/videos/careerflow-spiral-poster.jpg" />',
            `<meta name="twitter:image" content="${cleanUrl}/videos/careerflow-spiral-poster.jpg" />`
          );

        return modifiedHtml;
      }
      return html;
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    seoUrlPlugin()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
