"use client";

import React from "react";
import Section from "@/components/Section";
import WhatsAppTester from "@/components/WhatsAppTester";

export default function WhatsappPage() {
  return (
    <div className="flex flex-col items-start justify-start min-h-screen bg-gray-100 gap-8 p-8 text-black">
      <div className="flex flex-row items-center justify-center w-full">
        <h1 className="text-4xl font-bold">WhatsApp Testing</h1>
      </div>
      <div className="w-full">
        <Section>
          <WhatsAppTester />
        </Section>
      </div>
    </div>
  );
}
