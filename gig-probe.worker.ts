import { readContainerSeconds } from "@/lib/shola/sample-limit";

type Scope = {
  onmessage: ((event: MessageEvent<{ head?: ArrayBuffer; tail?: ArrayBuffer }>) => void) | null;
  postMessage: (message: unknown) => void;
};

const scope = globalThis as unknown as Scope;

scope.onmessage = (event) => {
  const head = new Uint8Array(event.data.head ?? new ArrayBuffer(0));
  const tail = new Uint8Array(event.data.tail ?? new ArrayBuffer(0));
  const seconds = readContainerSeconds(head) ?? readContainerSeconds(tail, "movie");
  scope.postMessage({ seconds: seconds ?? 0 });
};
