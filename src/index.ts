import Koa from "koa";
import Router from "@koa/router";
import { koaBody } from "koa-body";
import { uiRoute } from "./ui.js";
import { sleepRoute } from "./sleep.js";
import { debugRoute, deviceRoute } from "./tp-link.js";
import { onAirRoute } from "./on-air.js";

const app = new Koa();
const router = new Router();

router
  .get("/", uiRoute)
  .post("/", debugRoute)
  .get("/devices", deviceRoute)
  .post("/on-air", onAirRoute)
  .post("/sleep", sleepRoute);

app
  .use(
    koaBody({
      jsonLimit: "1kb",
    })
  )
  .use(router.routes())
  .use(router.allowedMethods());
app.listen(3000, "0.0.0.0");

console.log("home automation server running on port 3000");
