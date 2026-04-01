import React from "react";

export default function LogoMark() {
  return (
    <svg
      width="22" height="22" viewBox="0 0 22 22"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Checkmark in a rounded square */}
      <rect x="1" y="1" width="20" height="20" rx="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <path
        d="M6.5 11.5l3 3 6-7"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
