import Router from "@koa/router";
import TPLSmartDevice from "tplink-lightbulb";
import { officeLamp, officeSwitch, statusLamp } from "./tp-link.js";

let meetingInProgress = false;
let preMeetingState: TPLSmartDevice.DeviceInfo;

async function startMeeting() {
  if (!meetingInProgress) {
    meetingInProgress = true;
    preMeetingState = await statusLamp.device.info();
  }
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
      officeSwitch.turnOn();
      statusLamp.turnOnRedSignal();
      break;
    case "audio started":
      await startMeeting();
      statusLamp.turnOnOrangeSignal();
      break;
    case "camera stopped":
      // Video may be disabled during a meeting
      // don't assume it means the meeting is over
      if (meetingInProgress) {
        statusLamp.turnOnOrangeSignal();
      }
      officeLamp.turnOff();
      officeSwitch.turnOff();
      break;
    case "audio stopped":
      meetingInProgress = false;
      statusLamp.turnOff();
      // TODO: Add restore of previous light state
      break;
    default:
      console.log(`Ignoring unknown event "${event}"`);
      ctx.response.status = 400;
      ctx.response.body = JSON.stringify({ message: "Unknown event" });
      break;
  }
};
