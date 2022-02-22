/// <reference path="./types/tplink-lightbulb.d.ts" />
import Router from "@koa/router";
import TPLSmartDevice, { Device } from "tplink-lightbulb";

export const bedroomLamp = getLight(
  "Bedroom Lamp",
  process.env.BEDROOM_LAMP_IP
);
export const statusLamp = getLight(
  "Living Room Lamp",
  process.env.STATUS_LAMP_IP
);
export const officeLamp = getSwitch("Office Lamp", process.env.OFFICE_LAMP_IP);
export const officeSwitch = getDimmerSwitch(
  "Office Light Switch",
  process.env.OFFICE_SWITCH_IP
);

function initialize(name: string, ip?: string): TPLSmartDevice {
  const device = new TPLSmartDevice(ip);
  if (!device.ip) {
    console.log(name, "IP not passed. Looking on the network");
    // Search for device without awaiting
    findLight(name).then((light) => {
      device.ip = light.ip;
    }, console.error);
  }

  return device;
}
async function findLight(name: string) {
  return new Promise<Device>((resolve, reject) => {
    const scan = TPLSmartDevice.scan();
    const timeoutId = setTimeout(() => {
      scan.stop();
      reject(new Error("Timeout looking for " + name));
    }, 4000);
    scan.on("light", async (light: Device) => {
      if (light.name === name) {
        console.log("Found light", light);
        scan.stop();
        clearTimeout(timeoutId);
        resolve(light);
      }
    });
  });
}

export function getLight(name: string, ip?: string) {
  const device = initialize(name, ip);

  async function setState(
    state: Partial<TPLSmartDevice.DeviceInfo["light_state"]>,
    seconds = 1
  ) {
    if (!device.ip || device.ip === "0") {
      console.warn("Skipping setting", name, "switch because it was not found");
      return;
    }
    const newState = {
      mode: "normal",
      color_temp: 0,
      brightness: 0,
      saturation: 0,
      hue: 0,
      ...state,
    };
    console.log("new", name, "light state", newState);
    try {
      const response = await retryIfNoResponse(
        () =>
          device.power(
            Boolean(newState.brightness !== 0),
            seconds * 1000,
            newState
          ),
        `lamp.power(${JSON.stringify(state)})`
      );
      console.log("Lamp", name, "updated to:", response);
    } catch (error) {
      console.error("Error setting", name, "lamp state", error);
    }
  }
  const savedState: Partial<TPLSmartDevice.DeviceInfo["light_state"]> = {};

  return {
    device,
    setState,
    savedState,
    async turnOn() {
      await setState({ hue: 60, saturation: 20, brightness: 100 });
    },
    async turnOff() {
      await setState({ hue: 60, saturation: 20, brightness: 0 });
    },
    async turnOnLow() {
      await setState({ hue: 50, saturation: 40, brightness: 30 }, 3);
    },
    async startSunRise() {
      await setState({ hue: 20, saturation: 90, brightness: 10 });
      await sleep(1);
      await setState({ hue: 60, saturation: 20, brightness: 100 }, 40);
    },
    async turnOnNightLight() {
      return setState({ hue: 20, saturation: 90, brightness: 1 });
    },
    async turnOnRedSignal() {
      await setState({ hue: 10, saturation: 100, brightness: 100 });
    },
    async turnOnYellowSignal() {
      await setState({ hue: 60, saturation: 100, brightness: 100 });
    },
    /** Keep track of current state to restore later */
    async saveState() {
      const info = await device.info();
      // Need to retain reference to object
      Object.assign(savedState, info.light_state);
    },
    async restoreState() {
      return await setState(savedState);
    },
  };
}
export function getSwitch(name: string, ip?: string) {
  const device = initialize(name, ip);

  async function setState(state: boolean) {
    if (!device.ip || device.ip === "0") {
      console.warn("Skipping setting", name, "switch because it was not found");
      return;
    }
    console.log("Turning", name, state ? "on" : "off");
    try {
      const response = await retryIfNoResponse(() => device.power(state, 0));
      console.log("Outlet updated to:", response);
    } catch (error) {
      console.error(`Error setting ${name} switch state`, error);
    }
  }

  return {
    device,
    setState,
    async turnOn() {
      await setState(true);
    },
    async turnOff() {
      await setState(false);
    },
  };
}
export function getDimmerSwitch(name: string, ip?: string) {
  const device = initialize(name, ip);

  async function setState(state: boolean, brightness?: number) {
    if (!device.ip || device.ip === "0") {
      console.warn("Skipping setting", name, "switch because it was not found");
      return;
    }
    console.log("Turning", name, state ? "on" : "off");
    try {
      const response = await retryIfNoResponse(() =>
        // TODO: Brightness control doesn't seem to be working
        device.power(state, 0, brightness != null ? { brightness } : undefined)
      );
      console.log("Dimmer switch updated to:", response);
    } catch (error) {
      console.error(`Error setting ${name} switch state`, error);
    }
  }
  const savedState: Partial<TPLSmartDevice.DeviceInfo["light_state"]> = {};

  return {
    device,
    setState,
    async turnOn(brightness?: number) {
      await setState(true, brightness);
    },
    async turnOff() {
      await setState(false);
    },
    /** Keep track of current state to restore later */
    async saveState() {
      const info = await device.info();
      // Need to retain reference to object
      Object.assign(savedState, info.light_state);
    },
    async restoreState() {
      return await setState(Boolean(savedState.on_off), savedState.brightness);
    },
  };
}

export const deviceRoute: Router.Middleware<{}, {}> = async (ctx, next) => {
  const deviceList = await new Promise<Device[]>((resolve, reject) => {
    const devices: Device[] = [];
    console.log("starting scan");
    const scan = TPLSmartDevice.scan();
    scan.on("light", async (light: Device) => {
      console.log("device found", light);
      devices.push(light);
    });
    setTimeout(() => {
      console.log("Done scanning");
      scan.stop();
      resolve(devices);
    }, 500);
  });
  const sanitizedList = deviceList.map(({ ip, host, port, name }) => ({
    ip,
    host,
    port,
    name,
  }));
  ctx.body = JSON.stringify(sanitizedList, null, "\t");
  ctx.type = "application/json";
};

let index = 0;
const states = [
  { hue: 150, saturation: 80, brightness: 0 },
  { hue: 20, saturation: 90, brightness: 10 },
  { hue: 50, saturation: 30, brightness: 90 },
];
export const debugRoute: Router.Middleware<{}, {}> = async (ctx, next) => {
  console.log("Debug route");

  ctx.redirect("back");
};

function retryIfNoResponse<T>(
  callback: () => T,
  requestId = "",
  timeoutTime = 1000,
  retries = 3
) {
  return new Promise<T>(async (resolve, reject) => {
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      console.warn("Retrying request", requestId);
      if (retries === 0) {
        reject(new Error("Retries exceeded " + requestId));
      } else {
        // Recursively call till no retries left
        resolve(
          retryIfNoResponse(callback, requestId, timeoutTime, retries - 1)
        );
      }
    }, timeoutTime);

    const response = await callback();

    if (timedOut) {
      console.warn("Response received after timeout", requestId);
      return;
    }

    clearTimeout(timeoutId);
    resolve(response);
  });
}

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
