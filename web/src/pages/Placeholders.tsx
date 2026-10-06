import React from 'react';

export const Placeholder: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="page-content">
    <div className="page-header" style={{ margin: '-2rem -2rem 2rem -2rem' }}>
      <h1>{title}</h1>
    </div>
    <div className="placeholder-card">
      <h2>Integration Pending</h2>
      <p>{desc}</p>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>Data pipelines are currently out of scope for PR #1.</p>
    </div>
  </div>
);

export const Auctions: React.FC = () => <Placeholder title="Auctions" desc="This page will display auction boards and related real-estate tracking." />;
export const ReviewQueue: React.FC = () => <Placeholder title="Review Queue" desc="This page will provide the workflow for reviewing flagged properties." />;
