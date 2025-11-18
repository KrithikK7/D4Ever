import bgImage from "@background/bg/bg.png";

export const GlobalGradientBackdrop = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 -z-30"
    style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundAttachment: "fixed",
    }}
  />
);

export default GlobalGradientBackdrop;
