// Original creature line-art for the two teams - NOT Houndoom/Tinkaton or any
// other trademarked character, by design (see README.md / proposal doc).
// Team 1 = a hound/flame archetype in cyan. Team 2 = a round hammer/tinker
// archetype in magenta. Reused here at dashboard scale for visual continuity
// with the published rules landing page.

export function TeamOneAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="#2be3ff" strokeWidth="2" opacity="0.25" />
      <path
        d="M60 22c-9 0-15 7-15 15 0 5 2 8 2 8s-14 3-19 16c-3 8-1 16 3 21l-4 9 10-3c5 4 12 6 23 6s18-2 23-6l10 3-4-9c4-5 6-13 3-21-5-13-19-16-19-16s2-3 2-8c0-8-6-15-15-15z"
        stroke="#2be3ff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M45 40c-3-6-2-13 3-17" stroke="#2be3ff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M75 40c3-6 2-13-3-17" stroke="#2be3ff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="58" r="3.5" fill="#2be3ff" />
      <circle cx="70" cy="58" r="3.5" fill="#2be3ff" />
      <path d="M52 72c3 3 13 3 16 0" stroke="#2be3ff" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M60 88c-3 6-3 12 0 17 3-5 3-11 0-17z"
        fill="#ff9d3d"
        opacity="0.9"
      />
      <path d="M60 88c-2 5-2 9 0 13 2-4 2-8 0-13z" fill="#ffcb47" />
    </svg>
  );
}

export function TeamTwoAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="#ff3d7f" strokeWidth="2" opacity="0.25" />
      <ellipse cx="60" cy="66" rx="30" ry="26" stroke="#ff3d7f" strokeWidth="2.5" />
      <path d="M38 50c-4-8-2-16 4-20" stroke="#ff3d7f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M82 50c4-8 2-16-4-20" stroke="#ff3d7f" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="62" r="3.5" fill="#ff3d7f" />
      <circle cx="70" cy="62" r="3.5" fill="#ff3d7f" />
      <path d="M53 76c2.5 2.5 11.5 2.5 14 0" stroke="#ff3d7f" strokeWidth="2.5" strokeLinecap="round" />
      <g transform="translate(78,78) rotate(35)">
        <rect x="-4" y="-22" width="8" height="24" rx="2" fill="#ffcb47" stroke="#ff3d7f" strokeWidth="1.5" />
        <rect x="-11" y="-2" width="22" height="14" rx="3" fill="#ff3d7f" stroke="#ffcb47" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function avatarFor(team: "TEAM_1" | "TEAM_2") {
  return team === "TEAM_1" ? TeamOneAvatar : TeamTwoAvatar;
}
