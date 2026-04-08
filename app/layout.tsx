import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "sileo";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CRS — Customer Request System",
  description: "Customer request and workflow management platform for Oracle Petroleum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          theme="system"
          options={{
            roundness: 16,
            duration: 6000,
            autopilot: { expand: 180, collapse: 4200 },
            styles: {
              title: "text-sm font-semibold",
              description: "text-xs text-zinc-500",
            },
          }}
        />
      </body>
    </html>
  );
}
