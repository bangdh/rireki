import { ICONS } from "./icons";

/** Inline SVG sprite rendered once in the root layout (port of injectSprite() in assets/app.js). */
export function IconSprite() {
  return (
    <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      {Object.entries(ICONS).map(([name, paths]) => (
        <symbol key={name} id={`i-${name}`} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: paths }} />
      ))}
    </svg>
  );
}
