import type { Metadata } from "next";
import { Inter, Manrope, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const SITE_URL = "https://thecotswoldsway.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Cotswold Way | Book Trail Accommodation & Plan Your Walk",
    template: "%s | The Cotswold Way",
  },
  description:
    "Plan and book your Cotswold Way walk. 102 miles from Chipping Campden to Bath with 72 verified near-trail stays, interactive trail map, pub stops, and day-by-day itinerary planner.",
  keywords: [
    "Cotswold Way",
    "Cotswold Way accommodation",
    "Cotswold Way walking holiday",
    "Cotswold Way itinerary",
    "Cotswold Way B&B",
    "Cotswold Way camping",
    "Chipping Campden to Bath walk",
    "Cotswolds walking trail",
    "Cotswold Way route planner",
    "long distance walking England",
    "National Trail accommodation",
    "Cotswold Way pubs",
    "Cotswold Way map",
    "walking holiday Cotswolds",
    "Cotswold Way stages",
    "dog friendly Cotswold Way",
    "Cotswold Way luggage transfer",
    "best B&B Cotswold Way",
    "where to stay Cotswold Way",
    "Cotswold Way 7 day itinerary",
  ],
  authors: [{ name: "The Cotswold Way" }],
  creator: "The Cotswold Way",
  publisher: "The Cotswold Way",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: "The Cotswold Way",
    title: "The Cotswold Way | Book Trail Accommodation & Plan Your Walk",
    description:
      "102 miles from Chipping Campden to Bath. Find verified near-trail stays, plan your itinerary, and discover pubs and amenities along England's finest walking trail.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Cotswold Way — 102 miles from Chipping Campden to Bath",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Cotswold Way | Book Trail Accommodation & Plan Your Walk",
    description:
      "Plan your Cotswold Way walk with verified near-trail stays, interactive maps, and day-by-day itinerary planner.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}
