import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvent,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngLiteral } from "leaflet";
import L from "leaflet";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

export default function LocationInput({
  setLocation,
  initialPosition,
  error = false,
  errorText = "",
}: {
  setLocation: (location: LatLngLiteral | undefined) => void;
  initialPosition?: LatLngLiteral;
  error?: boolean;
  errorText?: string;
}) {
  const [markerPosition, setMarkerPosition] = useState<
    LatLngLiteral | undefined
  >(initialPosition);
  const [latInput, setLatInput] = useState<string>(
    initialPosition ? markerPosition!.lat.toFixed(4) : "",
  );
  const [lngInput, setLngInput] = useState<string>(
    initialPosition ? markerPosition!.lng.toFixed(4) : "",
  );
  const markerRef = useRef<L.Marker>(null);

  function AutoPanDraggableMarker({
    markerPosition,
    setMarkerPosition,
    children,
  }: {
    markerPosition: LatLngLiteral | undefined;
    setMarkerPosition: (pos: LatLngLiteral) => void;
    children?: React.ReactNode;
  }) {
    // If no initial position is provided, do not render the marker
    if (!markerPosition) {
      return;
    }
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const map = useMap();
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const markerRef = useRef<L.Marker>(null);

    //eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const marker = markerRef.current;
      if (!marker) return;

      // Handle when marker is dragged
      const handleDrag = () => {
        const latLng = marker.getLatLng();
        const containerPoint = map.latLngToContainerPoint(latLng);
        const container = map.getContainer();
        const buffer = 80;
        const panStep = 80;

        let dx = 0,
          dy = 0;

        // Auto pan the map if the marker is near the edge of the map
        if (containerPoint.x < buffer) dx = -panStep;
        else if (containerPoint.x > container.clientWidth - buffer)
          dx = panStep;

        if (containerPoint.y < buffer) dy = -panStep;
        else if (containerPoint.y > container.clientHeight - buffer)
          dy = panStep;

        if (dx !== 0 || dy !== 0) {
          map.panBy([dx, dy], { animate: false });
        }
      };

      // Handle when marker is dropped after dragging
      const handleDragEnd = () => {
        const latLng = marker.getLatLng();
        setMarkerPosition(latLng);
        setLocation(latLng);
        setLatInput(latLng.lat.toFixed(4));
        setLngInput(latLng.lng.toFixed(4));
      };

      marker.on("drag", handleDrag);
      marker.on("dragend", handleDragEnd);

      return () => {
        marker.off("drag", handleDrag);
        marker.off("dragend", handleDragEnd);
      };
    }, [map, setMarkerPosition]);

    return (
      <Marker draggable position={markerPosition} ref={markerRef}>
        {children}
      </Marker>
    );
  }

  // Handle when user clicks on the map to place a marker
  function MapClickHandler({
    setMarkerPosition,
  }: {
    setMarkerPosition: (pos: LatLngLiteral) => void;
  }) {
    useMapEvent("click", (e) => {
      const latLng = e.latlng;
      setMarkerPosition(latLng); // position refers to marker position
      setLocation(latLng); // location refers to coordinates to be saved
      setLatInput(latLng.lat.toFixed(4));
      setLngInput(latLng.lng.toFixed(4));
    });

    return null;
  }

  const handleLatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLatInput(e.target.value);
    const newLat = parseFloat(e.target.value);
    if (!isNaN(newLat)) {
      setMarkerPosition((prev) => {
        const lng = prev?.lng ?? 0;
        return { lat: newLat, lng };
      });
      if (markerRef.current && markerPosition) {
        markerRef.current.setLatLng({ lat: newLat, lng: markerPosition.lng });
      }
    }
    setLocation(
      markerPosition
        ? { lat: newLat, lng: markerPosition.lng }
        : { lat: newLat, lng: 0 },
    );
  };

  const handleLngInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLngInput(e.target.value);
    const newLng = parseFloat(e.target.value);
    if (!isNaN(newLng)) {
      setMarkerPosition((prev) => {
        const lat = prev?.lat ?? 0;
        return { lat, lng: newLng };
      });
      if (markerRef.current && markerPosition) {
        markerRef.current.setLatLng({ lat: markerPosition.lat, lng: newLng });
      }
    }
    setLocation(
      markerPosition
        ? { lat: markerPosition.lat, lng: newLng }
        : { lat: 0, lng: newLng },
    );
  };

  return (
    <div className="max-h-[500px] flex flex-col gap-2">
      <div className="flex flex-row items-center justify-start gap-4">
        <div className="flex flex-col gap-1 items-start justify-start">
          <div className="flex flex-row items-center justify-start gap-4">
            <p className="">
              Your farm location: {"("}
              <input
                type="text"
                value={latInput}
                onChange={handleLatInputChange}
                className={`bg-white rounded p-2 h-1/2 m-2 ${error ? "border border-red-500" : ""}`}
              />
              ,
              <input
                type="text"
                value={lngInput}
                onChange={handleLngInputChange}
                className={`bg-white rounded p-2 h-1/2 m-2 ${error ? "border border-red-500" : ""}`}
              />
              {")"}
            </p>
          </div>
          <p className="text-sm">Click and drag to place or move a marker</p>
          {error && <p className="text-sm text-red-500">{errorText}</p>}
        </div>
      </div>
      <MapContainer
        center={markerPosition ?? { lat: 4.047, lng: 102.198 }}
        zoom={7}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler setMarkerPosition={setMarkerPosition} />
        {markerPosition && (
          <AutoPanDraggableMarker
            markerPosition={markerPosition}
            setMarkerPosition={setMarkerPosition}
          >
            <Popup>
              Your farm location ({markerPosition!.lat.toFixed(4)},{" "}
              {markerPosition!.lng.toFixed(4)})
            </Popup>
          </AutoPanDraggableMarker>
        )}
      </MapContainer>
    </div>
  );
}
