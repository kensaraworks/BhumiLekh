import React from 'react';

export const MapPlaceholder: React.FC = () => {
  return (
    <div className="page-content">
      <div className="page-header" style={{ margin: '-2rem -2rem 2rem -2rem' }}>
        <h1>Map & Parcel Dossier</h1>
      </div>
      <div className="placeholder-card">
        <h2>Map Integration Pending</h2>
        <p>This page will house the interactive MapLibre GL map, vector tiles, and parcel dossier drawer.</p>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Data pipelines are currently out of scope for PR #1.</p>
      </div>
    </div>
  );
};
