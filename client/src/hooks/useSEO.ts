import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Sets document.title and meta description/keywords for SEO.
 * Call at the top of each page component.
 */
export function useSEO({ title, description, keywords }: SEOOptions) {
  useEffect(() => {
    // Title
    document.title = title;

    // Description
    let descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.name = "description";
      document.head.appendChild(descMeta);
    }
    descMeta.content = description;

    // Keywords
    if (keywords) {
      let kwMeta = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
      if (!kwMeta) {
        kwMeta = document.createElement("meta");
        kwMeta.name = "keywords";
        document.head.appendChild(kwMeta);
      }
      kwMeta.content = keywords;
    }

    // OG title + description (social sharing)
    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;

    let ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = description;
  }, [title, description, keywords]);
}
