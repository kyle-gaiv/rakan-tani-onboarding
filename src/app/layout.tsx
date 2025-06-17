import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import { MqttProvider } from "@/api/MqttContext";
import { IDProvider } from "@/api/IDContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rakan Tani Onboarding Page",
  description: "Onboarding page for Rakan Tani",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <IDProvider>
          <MqttProvider>
            {children}
            <ToastContainer
              position="bottom-center"
              autoClose={2500}
              hideProgressBar={true}
            />
          </MqttProvider>
        </IDProvider>
      </body>
    </html>
  );
}
