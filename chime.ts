export function playChime() {
  try {
    const audio = new Audio("/flare_pop.mp3");
    audio.volume = 0.45;
    void audio.play();
  } catch {
    /* autoplay can be blocked until the next tap */
  }
}
