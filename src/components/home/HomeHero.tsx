// src/components/home/HomeHero.tsx
import React from "react";
import { SearchInputArea, SearchInputAreaProps } from "./SearchInputArea";

export const HomeHero = (props: SearchInputAreaProps) => {
  return (
    <div className="hero" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 className="hero-headline">Smarter medicine starts here.</h1>
      <div style={{ marginTop: "24px", position: 'relative', width: '100%', maxWidth: '700px' }}>
        <SearchInputArea {...props} />
      </div>
      <p className="disclaimer" style={{ marginTop: "36px" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4M12 8h.01"></path>
        </svg> 
        Please do not enter any patient-identifiable information.
      </p>
    </div>
  );
};