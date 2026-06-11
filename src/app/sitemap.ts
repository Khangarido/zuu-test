import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.zuutest.site", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://www.zuutest.site/login", lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    { url: "https://www.zuutest.site/register", lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  ]
}
