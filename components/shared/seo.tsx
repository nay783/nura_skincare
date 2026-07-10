import React from "react";
import type { Metadata } from "next";

interface JsonLdProps {
  schema: Record<string, unknown>;
}

/**
 * Component to inject JSON-LD Structured Data into the document head.
 * Useful for product schemas, blog posts, local business coordinates, etc.
 */
export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface GenerateSeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: "website" | "article";
}

/**
 * Reusable utility to construct Next.js metadata configurations.
 */
export function generateSEO({
  title,
  description,
  path,
  ogImage = "/images/og-default.jpg",
  type = "website",
}: GenerateSeoProps): Metadata {
  const url = `https://nura.co.mz${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Pre-defined JSON-LD Schema generators for store schemas.
 */
export const seoSchemas = {
  localBusiness: () => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Nura Skincare",
    "image": "https://nura.co.mz/images/logo.png",
    "@id": "https://nura.co.mz/#store",
    "url": "https://nura.co.mz",
    "telephone": "+258840000000",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Avenida Julius Nyerere",
      "addressLocality": "Maputo",
      "addressRegion": "Maputo Cidade",
      "addressCountry": "MZ"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "opens": "09:00",
      "closes": "18:00"
    }
  }),

  product: (product: {
    name: string;
    description: string;
    image: string;
    sku: string;
    price: number;
    inStock: boolean;
    slug: string;
  }) => ({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.image,
    "description": product.description,
    "sku": product.sku,
    "mpn": product.sku,
    "brand": {
      "@type": "Brand",
      "name": "Nura Skincare"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://nura.co.mz/products/${product.slug}`,
      "priceCurrency": "MZN",
      "price": product.price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.inStock 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock"
    }
  }),

  article: (post: {
    title: string;
    description: string;
    image: string;
    slug: string;
    publishedAt: string;
    updatedAt: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": post.title,
    "image": [post.image],
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt || post.publishedAt,
    "author": [{
      "@type": "Organization",
      "name": "Nura Skincare Journal",
      "url": "https://nura.co.mz/blog"
    }]
  })
};
