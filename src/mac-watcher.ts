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

// const command = "log stream | grep -e audioEngine -e kCameraStream";
// // const command = "log stream";
// await bash.stdin.write(encoder.encode(command));

// await bash.stdin.close();

// Server loop running inside IIFE
(async () => {
  console.log("Listening for events");
  for await (const line of readLines(bash.stdout)) {
    // TODO: Find something that works with slack calls
    // TODO: Move to a single regex test
    if (line.includes("audioEngine") || line.includes("kCameraStream")) {
      let event: string | undefined = undefined;
      if (line.includes("audioEngineStarting")) {
        event = "audio started";
      } else if (line.includes("audioEngineStopped")) {
        event = "audio stopped";
      } else if (line.includes("kCameraStreamStart")) {
        event = "camera started";
      } else if (line.includes("kCameraStreamStop")) {
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
