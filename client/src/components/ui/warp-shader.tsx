import { Warp } from "@paper-design/shaders-react";

interface WarpShaderBgProps {
  /** Override the colour palette — defaults to 6+1 dark orange brand */
  colors?: string[];
  className?: string;
}

/**
 * Full-bleed Warp shader background for form steps.
 * Uses fixed positioning so it always covers the full viewport on mobile,
 * even when the keyboard pushes content up or the page scrolls.
 */
export default function WarpShaderBg({
  colors = [
    "hsl(20, 100%, 4%)",    // near-black orange
    "hsl(22, 90%, 10%)",    // very dark amber
    "hsl(18, 100%, 18%)",   // deep burnt orange
    "hsl(25, 80%, 8%)",     // dark warm brown
  ],
  className = "",
}: WarpShaderBgProps) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`} aria-hidden="true">
      <Warp
        style={{ height: "100%", width: "100%" }}
        proportion={0.45}
        softness={0.9}
        distortion={0.18}
        swirl={0.7}
        swirlIterations={8}
        shape="checks"
        shapeScale={0.08}
        scale={1}
        rotation={0}
        speed={0.6}
        colors={colors}
      />
      {/* Darken overlay so text stays readable */}
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />
    </div>
  );
}
