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

const CAMERA_LOG = "CMIOHardware.cpp";
const AUDIO_START_LOG = "kTCCServiceMicrophone";
const AUDIO_STOP_LOG = "HALS_IOEngine2::StopIO";

// Server loop running inside IIFE
(async () => {
  console.log("Listening for events");
  for await (const line of readLines(bash.stdout)) {
    // TODO: Move to a single regex test
    if (
      [CAMERA_LOG, AUDIO_START_LOG, AUDIO_STOP_LOG].some((keyword) =>
        line.includes(keyword)
      )
    ) {
      let event: string | undefined = undefined;
      if (line.includes(AUDIO_START_LOG)) {
        event = "audio started";
      } else if (
        line.includes(AUDIO_STOP_LOG) &&
        !(await isMicrophoneStillConnected())
      ) {
        event = "audio stopped";
      } else if (line.includes(CAMERA_LOG)) {
        if (line.includes("StartStream")) {
          event = "camera started";
        } else if (line.includes("StopStream")) {
          event = "camera stopped";
        }
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

/**
 * Check if audio device is still connected.
 *
 * This is needed because "HALS_IOEngine2::StopIO" seems to be called too frequently
 *
 * Inspired by https://stackoverflow.com/a/66070592/4252741
 * May not work with bluetooth headphones according to comments
 */
async function isMicrophoneStillConnected() {
  const ioreg = Deno.run({
    cmd: ["ioreg", "-l"],
    stdout: "piped",
    stdin: "piped",
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  for await (const line of readLines(ioreg.stdout)) {
    if (line.includes("IOAudioEngineState")) {
      console.log("Line", line);
      if (line.includes('"IOAudioEngineState" = 1')) {
        console.log("Microphone is determined to be on");
        return true;
      }
    }
  }
  console.log("Microphone is determined to be off");
  return false;
}
