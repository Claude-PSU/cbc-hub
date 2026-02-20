import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Lora } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Claude Builder Club — Penn State",
  description:
    "Empowering Penn State students to explore the frontier of AI by building with Claude in a safe, responsible, and creative environment.",
  openGraph: {
    title: "Claude Builder Club — Penn State",
    description:
      "Empowering Penn State students to explore the frontier of AI with Claude.",
    siteName: "Claude Builder Club at Penn State",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </AuthProvider>
  );
}
