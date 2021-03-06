// This is a deno script
// TODO: consider moving this where it has it's own vscode config

import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import { writeAll } from "https://deno.land/std@0.104.0/io/util.ts";

console.log("Starting mac-watcher server");
const bash = Deno.run({
  cmd: ["log", "stream"],
  stdout: "piped",
  stdin: "piped",
});

const CAMERA_LOG = "kCameraStream";
const AUDIO_START_LOG = "HALS_Device::_GetCombinedVolumeScalar";
const AUDIO_STOP_LOG = "AUBeamIt: Reset";

// Server loop running inside IIFE
(async () => {
  console.log("Listening for events");
  for await (const line of readLines(bash.stdout)) {
    // TODO: Find something that works with slack calls
    // TODO: Move to a single regex test
    if (
      [CAMERA_LOG, AUDIO_START_LOG, AUDIO_STOP_LOG].some((keyword) =>
        line.includes(keyword)
      )
    ) {
      let event: string | undefined = undefined;
      if (line.includes(AUDIO_START_LOG)) {
        event = "audio started";
      } else if (line.includes(AUDIO_STOP_LOG)) {
        event = "audio stopped";
      } else if (line.includes(CAMERA_LOG + "Start")) {
        event = "camera started";
      } else if (line.includes(CAMERA_LOG + "Stop")) {
        event = "camera stopped";
      }
      // Debugging
      // const encoder = new TextEncoder();
      // await writeAll(Deno.stdout, encoder.encode(line + "\n"));
      if (event) {
        console.log(`Sending "${event}" for line "${line}"`);
        fetch("http://localhost:3000/on-air", {
          method: "post",
          body: JSON.stringify({ event }),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }).catch(console.error);
      }
    }
  }
})();

console.log("Server started");
