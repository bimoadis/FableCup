import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Fx from "@/components/Fx";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  axes: ["opsz"],
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Anthropos Cup · The Market Behind the Narrative",
  description:
    "Anthropos Cup turns a billion World Cup opinions into one live market of probabilities. The prediction platform for World Cup 2026.",
  openGraph: {
    title: "Anthropos Cup · The Market Behind the Narrative",
    description:
      "A billion opinions. One market. The prediction platform for World Cup 2026.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${instrument.variable} ${plexMono.variable}`}
      >
        <Nav />
        {children}
        <Footer />
        <Fx />
      </body>
    </html>
  );
}
