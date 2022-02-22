import Router from "@koa/router";
import TPLSmartDevice from "tplink-lightbulb";
import { officeLamp, officeSwitch, statusLamp } from "./tp-link.js";

let meetingInProgress = false;

async function startMeeting() {
  const originalInProgressState = meetingInProgress;
  if (!meetingInProgress) {
    meetingInProgress = true;
    statusLamp.saveState();
    officeSwitch.saveState();
  }
  return originalInProgressState;
}

export const onAirRoute: Router.Middleware<{}, {}> = async (ctx, next) => {
  ctx.accepts("application/json");
  console.log(
    `[${new Date().toISOString()}] Incoming event: `,
    ctx.request.body
  );

  const { event } = ctx.request.body;
  ctx.response.status = 200;

  switch (event) {
    case "camera started":
      await startMeeting();
      officeLamp.turnOn();
      officeSwitch.turnOn(100);
      statusLamp.turnOnRedSignal();
      break;
    case "audio started":
      const wasInProgress = await startMeeting();
      if (!wasInProgress) {
        statusLamp.turnOnYellowSignal();
      }
      break;
    case "camera stopped":
      // Video may be disabled during a meeting
      // don't assume it means the meeting is over
      if (meetingInProgress) {
        statusLamp.turnOnYellowSignal();
      }
      officeLamp.turnOff();
      officeSwitch.restoreState();
      break;
    case "audio stopped":
      meetingInProgress = false;
      statusLamp.restoreState();
      break;
    default:
      console.log(`Ignoring unknown event "${event}"`);
      ctx.response.status = 400;
      ctx.response.body = JSON.stringify({ message: "Unknown event" });
      break;
  }
};
