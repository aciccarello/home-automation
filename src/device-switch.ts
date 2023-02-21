import Router from "@koa/router";
import { bedroomLamp, officeLamp, officeSwitch } from "./tp-link.js";

const TARGETS = {
  BEDROOM_LAMP: "bedroom-lamp",
  OFFICE: "office",
} as const;
type Targets = typeof TARGETS[keyof typeof TARGETS];

const STATES = {
  OFF: "OFF",
  NIGHT: "NIGHT",
  LOW: "LOW",
  HIGH: "HIGH",
} as const;
type States = typeof STATES[keyof typeof STATES];

function render(target: Targets, activeState: States) {
  let name: string;
  let buttons: { state: string; label: string; active?: boolean }[] = [];
  switch (target) {
    case TARGETS.BEDROOM_LAMP:
      name = "Bedroom lamp";
      buttons = [
        { label: "Turn Off", state: "OFF" },
        { label: "Night Light", state: "NIGHT" },
        { label: "Turn On Low", state: "LOW" },
        { label: "Turn On High", state: "HIGH" },
      ];
      break;
    case TARGETS.OFFICE:
      name = "Office lights";
      buttons = [
        { label: "Turn Off", state: "OFF" },
        { label: "Switch only", state: "LOW" },
        { label: "Full brightness", state: "HIGH" },
      ];
      break;
    default:
      name = "Unknown";
  }

  buttons = buttons.map(({ label, state }) => ({
    label,
    state,
    active: state === activeState,
  }));

  return `
	<!DOCTYPE html>
<html>
  <head>
    <title>${name} | Home Automation</title>
    <meta name="description" content="A personal home automation server">
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		button { margin: 4px; }
	</style>
  </head>
  <body>
    <h1>Home Automation Server</h1>
	<h2>${name} Toggle</h2>
    <form method="POST">
  		${buttons.map(
        ({ state, label, active }) => `
			<button type="button"${
        active
          ? `
				class="active"`
          : ""
      }
				onClick="fetch('/switch?target=${target}', {method: 'POST', body: JSON.stringify({state: '${state}'}), headers: {'Content-Type': 'application/json'}})">
				${label}
			</button>
		`
      )}
    </form>
  </body>
</html>

	`;
}

export const toggleRoute: Router.Middleware<{}, {}> = async (ctx, next) => {
  ctx.accepts("html");
  const { target } = ctx.request.query ?? {};
  let state: States = STATES.OFF;
  switch (target) {
    case TARGETS.BEDROOM_LAMP:
      await bedroomLamp.saveState();
      if (bedroomLamp.savedState.on_off) {
        state = STATES.OFF;
      } else {
        state = STATES.LOW;
      }
      break;
    case TARGETS.OFFICE:
      // Plug seems to have different device info
      const info: any = await officeLamp.device.info();
      if (info.on_time) {
        state = STATES.OFF;
      } else {
        state = STATES.HIGH;
      }
      break;
  }

  const modifiedCtx = {
    ...ctx,
    request: {
      ...ctx.request,
      query: { target },
      body: { state },
    },
  };
  deviceSwitchRoute(modifiedCtx, next);
};

export const deviceSwitchRoute: Router.Middleware<{}, {}> = async (
  ctx,
  next
) => {
  if (typeof ctx.accepts === "function") {
    ctx.accepts("application/json");
  }
  console.log(
    `[${new Date().toISOString()}] Incoming event: `,
    ctx.request.query,
    ctx.request.body
  );

  const { target } = ctx.request.query ?? {};
  const { state } = ctx.request.body ?? {};

  function badStateValue() {
    console.log(`Ignoring unknown state "${state}"`);
    ctx.response.status = 400;
    ctx.response.body = "Bad request: unknown state";
  }

  if (typeof target !== "string") {
    console.log(`Ignoring unknown target "${target}"`);
    ctx.response.status = 400;
    ctx.response.body = "Bad request: unknown target";
    return;
  }
  if (typeof state !== "string") {
    return badStateValue();
  }

  switch (target) {
    case TARGETS.BEDROOM_LAMP:
      switch (state) {
        case STATES.OFF:
          bedroomLamp.turnOff();
          break;
        case STATES.NIGHT:
          bedroomLamp.turnOnNightLight();
          break;
        case STATES.LOW:
          bedroomLamp.turnOnLow();
          break;
        case STATES.HIGH:
          bedroomLamp.turnOn();
          break;
        default:
          return badStateValue();
      }
      break;
    case TARGETS.OFFICE:
      switch (state) {
        case STATES.OFF:
          officeLamp.turnOff();
          officeSwitch.turnOff();
          break;
        case STATES.LOW:
          officeLamp.turnOff();
          officeSwitch.turnOn(50);
          break;
        case STATES.HIGH:
          officeLamp.turnOn();
          officeSwitch.turnOn(100);
          break;
        default:
          return badStateValue();
      }
      break;
    default:
      console.log(`Ignoring unknown target "${target}"`);
      ctx.response.status = 400;
      ctx.response.body = "Bad request: unknown target";
      return;
  }
  ctx.response.body = render(target, state);
};
