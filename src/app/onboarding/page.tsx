"use client";

import Section from "@/components/Section";
import { jsonToMermaid, nodeIdToHlt } from "@/utils/helpers";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { LatLngLiteral } from "leaflet";
import { useSearchParams } from "next/navigation";
import { useMqttContext } from "@/api/MqttContext";
import { useID } from "@/api/IDContext";
import DropdownInput from "@/components/DropdownInput";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamically import LocationInput to avoid SSR issues with Leaflet
const LocationInputDynamic = dynamic(
  () => import("@/components/LocationInput"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center ">
        <p className="text-lg font-semibold">Loading map...</p>
      </div>
    ),
  },
);

// Dynamically import MermaidDiagram to avoid SSR issues
const MermaidDiagramDynamic = dynamic(
  () =>
    import("@lightenna/react-mermaid-diagram").then(
      (mod) => mod.MermaidDiagram,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center">
        <p className="text-lg font-semibold">Loading diagram...</p>
      </div>
    ),
  },
);

export default function OnboardingPage() {
  const [mermaidChartText, setMermaidChartText] = useState<string>(`
    flowchart LR
        A-->B
  `);
  const [mermaidLoading, setMermaidLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [location, setLocation] = useState<LatLngLiteral | undefined>();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [completedOnboarding, setCompletedOnboarding] =
    useState<boolean>(false);
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rerenderFlag, setRerenderFlag] = useState<number>(0);
  const { publish } = useMqttContext();
  const searchParams = useSearchParams();
  const { id: sessionID } = useID();
  const [formErrors, setFormErrors] = useState({
    name: "",
    location: "",
    day: "",
    ricetype: "",
  });

  // MR220 CL2 = 0, MR47 = 1, MRQ76 = 2
  const riceTypeOptions = ["MR220 CL2", "MR47", "MRQ76"];
  const [selectedRiceType, setSelectedRiceType] = useState<number>(0);

  const handleSaveInformation = () => {
    const inputErrors = {
      name: !name ? "Name is required" : "",
      location: !location ? "Location is required" : "",
      day: !selectedDay ? "Current stage is required" : "",
      ricetype: selectedRiceType === null ? "Rice type is required" : "",
    };
    setFormErrors(inputErrors);

    if (!name || !location || !selectedDay || selectedRiceType === null) {
      toast.error("Please fill in all fields before saving!");
      return;
    }

    const message = JSON.stringify({
      // takes sessionId from URL query string or uses sessionID from context
      // e.g. ...?sessionId=12345
      sessionId: Number(searchParams.get("sessionId")) || sessionID,
      hlt: Number(selectedDay),
      name: name,
      ricetype: Number(selectedRiceType),
      location: {
        x: location?.lng,
        y: location?.lat,
      },
    });
    try {
      publish("onboard", message); // send info to MQTT topic
      toast.success("Information saved successfully!");
      setTimeout(() => {
        setCompletedOnboarding(true);
      }, 500); // Delay to allow toast to show
      setRerenderFlag((prev) => prev + 1); // Trigger rerender
    } catch (error) {
      console.error("Error publishing to MQTT:", error);
      toast.error(
        "Error publishing to MQTT: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  // Runs initial query to get schedule and convert to mermaid format
  useEffect(() => {
    const generateSchedule = async () => {
      setMermaidLoading(true);
      const mermaidText = await jsonToMermaid();
      setMermaidChartText(mermaidText);
      setMermaidLoading(false);
    };

    if (!completedOnboarding) generateSchedule();
  }, [completedOnboarding]);

  // Handler for click events in mermaid diagram
  // Sets nodeId to the ID of the clicked node (hlt) to trigger HLT query
  useEffect(() => {
    if (!mermaidLoading) {
      (window as any).handleDayNodeClick = function (nodeId: string) {
        const dayHlt = nodeIdToHlt(nodeId);
        setSelectedDay(dayHlt.toString());
        toast.success(`Day ${dayHlt} selected!`);
        // Remove any previous 'selected' class assignment
        const cleanedMermaidText = mermaidChartText.replace(
          /class\s+\d+\s+selected/g,
          "",
        );
        // Add the new 'selected' class assignment to the clicked node
        const newMermaidText =
          cleanedMermaidText + `\n  class ${nodeId} selected\n`;
        setMermaidChartText(newMermaidText);
      };
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mermaidLoading]);

  return (
    <div className="flex flex-col items-start justify-start min-h-screen bg-gray-100 p-8 gap-8 text-black">
      {completedOnboarding && (
        <div className="flex flex-col items-center justify-center w-full gap-4">
          <h1 className="text-4xl font-bold">
            Thank you for completing the Rakan Tani onboarding process!
          </h1>
          <p className="text-xl font-semibold">
            Return to WhatsApp to continue
          </p>
          <p className="mt-8 text-xl font-semibold">
            If you would like to edit your information, press the button below
          </p>
          <Button
            label="Return to Information Page"
            onClick={() => {
              setCompletedOnboarding(false);
              setTimeout(() => {
                setRerenderFlag((prev) => prev + 1); // Trigger rerender
                setMermaidChartText(mermaidChartText);
              }, 500); // Delay to allow state change to take effect
            }}
          />
          <Link
            href="/"
            className="p-2 rounded-md font-semibold bg-blue-500 text-white"
          >
            Return to Home Page
          </Link>
        </div>
      )}
      {!completedOnboarding && (
        <>
          <div className="flex justify-center w-full">
            <h1 className="text-4xl font-bold mb-4">Onboarding Page</h1>
          </div>
          <div className="w-full">
            <Section>
              <div className="flex flex-col items-start justify-start gap-4 w-full">
                <h2 className="text-2xl font-semibold">
                  Enter Your Information
                </h2>
                <div className="grid grid-cols-3 gap-8 w-full">
                  <div className="flex flex-col items-start justify-start gap-4 w-full">
                    <TextInput
                      label="Name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      id="name"
                      error={!!formErrors.name}
                      errorText={formErrors.name}
                    />
                    <DropdownInput
                      label="Rice Type"
                      id="rice-type"
                      value={selectedRiceType}
                      onChange={(e) =>
                        setSelectedRiceType(Number(e.target.value))
                      }
                      options={riceTypeOptions.map((type, index) => ({
                        value: index.toString(),
                        label: type,
                      }))}
                      error={!!formErrors.ricetype}
                      errorText={formErrors.ricetype}
                    />
                  </div>
                  <div className="col-span-2 w-full h-full">
                    {/* Can set initial position by taking from database if present */}
                    <LocationInputDynamic
                      setLocation={setLocation}
                      initialPosition={location}
                      error={!!formErrors.location}
                      errorText={formErrors.location}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start justify-start gap-4 w-full mt-2">
                <h3 className="text-lg font-bold">
                  Click a day to select your current stage
                </h3>
                {!!formErrors.day && (
                  <p className="text-sm text-red-500">{formErrors.day}</p>
                )}
                <div
                  className={`w-full overflow-x-auto bg-white rounded-md p-4 ${!!formErrors.day ? "border border-red-500" : ""}`}
                >
                  {mermaidLoading ? (
                    <div className="text-lg text-black text-center font-semibold">
                      Loading...
                    </div>
                  ) : (
                    <div
                      className="shrink-0 h-auto"
                      style={{ minWidth: `9000px` }}
                    >
                      <MermaidDiagramDynamic
                        className="h-auto"
                        securityLevel="loose"
                      >
                        {mermaidChartText}
                      </MermaidDiagramDynamic>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center justify-end w-full mt-2">
                <Button
                  label="Save Information"
                  onClick={handleSaveInformation}
                />
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
