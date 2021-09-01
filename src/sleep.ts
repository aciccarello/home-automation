import Router from "@koa/router";
import { getSleepLamp } from "./tp-link.js";

export const sleepRoute: Router.Middleware<{}, {}> = async (ctx, next) => {
  ctx.accepts("application/json");
  console.log(
    `[${new Date().toISOString()}] Incoming event: `,
    ctx.request.body
  );

  const { event } = ctx.request.body;

  switch (event) {
    case "alarm_alert_start":
      getSleepLamp().sunRise();
      break;
    case "time_to_bed_alarm_alert":
    case "sleep_tracking_paused":
      // Turn on light with red tone
      const { turnOnNightLight } = await getSleepLamp();
      turnOnNightLight();
      break;
    case "alarm_snooze_clicked":
      getSleepLamp().turnOnLow();
      break;
    case "alarm_alert_dismiss":
    case "alarm_snooze_canceled":
    case "sleep_tracking_resumed":
    case "sleep_tracking_started":
    case "sleep_tracking_stopped":
      const { turnOff } = await getSleepLamp();
      turnOff();
      break;
    default:
      console.log(`Ignoring event "${event}"`);
  }
};
