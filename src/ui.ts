import Router from "@koa/router";

export const uiRoute: Router.Middleware<{}, {}> = async (ctx, next) => {
  ctx.body = `
	<!DOCTYPE html>
<html>
  <head>
    <title>Home Automation</title>
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
    <form method="POST">
      <button type="submit">Debug</button>
      <button type="button" onClick="fetch('/on-air', {method: 'POST', body: JSON.stringify({event: 'audio stopped'}), headers: {'Content-Type': 'application/json'}})">End Meeting</button>
	  <a href="/devices">Devices</a>
    </form>
  </body>
</html>

	`;
};
