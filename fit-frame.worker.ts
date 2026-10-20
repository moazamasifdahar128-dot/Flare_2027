import { fitFrame } from "./fit-frame";

self.onmessage = (event: MessageEvent<{ width?: number; height?: number }>) => {
  const width = Number(event.data?.width) || 0;
  const height = Number(event.data?.height) || 0;
  self.postMessage(fitFrame(width, height));
};
