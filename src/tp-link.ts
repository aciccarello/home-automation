/// <reference path="./types/tplink-lightbulb.d.ts" />
import Router from "@koa/router";
import TPLSmartDevice, { Device } from "tplink-lightbulb";

let lamp = new TPLSmartDevice(process.env.LAMP_IP);

if (!lamp.ip) {
  console.log("Lamp IP not passed. Looking on the network");
  findLight().then((light) => {
    lamp.ip = light.ip;
  }, console.error);
}
async function findLight() {
  return new Promise<Device>((resolve, reject) => {
    const scan = TPLSmartDevice.scan();
    const timeoutId = setTimeout(() => {
      scan.stop();
      reject(new Error("Timeout looking for lamp"));
    }, 4000);
    scan.on("light", async (light: Device) => {
      if (light.name === "Lamp") {
        console.log("Found light", light);
        scan.stop();
        clearTimeout(timeoutId);
        resolve(light);
      }
    });
  });
}

export function getSleepLamp() {
  return {
    lamp,
    async turnOn() {
      await setLampState({ hue: 60, saturation: 20, brightness: 100 });
    },
    async turnOnLow() {
      await setLampState({ hue: 50, saturation: 40, brightness: 30 }, 3);
    },
    async sunRise() {
      await setLampState({ hue: 20, saturation: 90, brightness: 10 });
      await sleep(1);
      await setLampState({ hue: 60, saturation: 20, brightness: 100 }, 40);
    },
    async turnOff() {
      await setLampState({ hue: 60, saturation: 20, brightness: 0 });
    },
    async turnOnNightLight() {
      return setLampState({ hue: 20, saturation: 90, brightness: 10 });
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
  const lampInfo = await lamp.info().catch(console.error);
  console.log("Light info", await lampInfo);
  getSleepLamp().sunRise();

  ctx.redirect("back");
};

async function setLampState(
  state: { hue: number; saturation: number; brightness: number },
  seconds = 1
) {
  const newState = { mode: "normal", color_temp: 0, ...state };
  console.log("newState", newState);
  const response = await retryIfNoResponse(
    () =>
      lamp.power(Boolean(newState.brightness !== 0), seconds * 1000, newState),
    `lamp.power(${JSON.stringify(state)})`
  ).catch(console.error);
  console.log("Lamp updated to:", response);
}

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
