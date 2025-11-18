import videoSource from "@background/video/1.mp4";

export const VideoBackground = () => (
  <video
    className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover"
    autoPlay
    loop
    muted
    playsInline
  >
    <source src={videoSource} type="video/mp4" />
  </video>
);

export default VideoBackground;
