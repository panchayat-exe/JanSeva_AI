import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ initialPosition, onSelectLocation }) {
  const [position, setPosition] = useState(initialPosition || { lat: 19.0760, lng: 72.8777 }); // Default Mumbai

  const handleConfirm = () => {
    if (position) {
      onSelectLocation(position.lat, position.lng);
    }
  };

  return (
    <div className="map-picker animate-fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      <button className="btn btn-primary mt-4" onClick={handleConfirm} disabled={!position}>
        Confirm Location
      </button>
    </div>
  );
}
