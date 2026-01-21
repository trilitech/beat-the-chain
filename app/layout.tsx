import type { Metadata } from "next";
import { Inter, Roboto_Mono, Racing_Sans_One, Sedgwick_Ave_Display } from "next/font/google";
import "./globals.css";

// Setup font variables
const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter' 
});
const robotoMono = Roboto_Mono({ 
  subsets: ["latin"], 
  variable: '--font-roboto-mono' 
});
const racingSansOne = Racing_Sans_One({ 
  subsets: ["latin"], 
  weight: "400",
  variable: '--font-racing-sans-one' 
});
const sedgwickAveDisplay = Sedgwick_Ave_Display({ 
  subsets: ["latin"], 
  weight: "400",
  variable: '--font-sedgwick-ave-display' 
});

export const metadata: Metadata = {
  title: "Etherlink - Proof of Speed",
  description: "Beat Etherlink Instant confirmations with this typing speed test.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* NO Myna UI scripts here. 
        We will import them as components.
      */}
      <head />
      {/* Apply the font variables to the body */}
      <body className={`${inter.variable} ${robotoMono.variable} ${racingSansOne.variable} ${sedgwickAveDisplay.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
