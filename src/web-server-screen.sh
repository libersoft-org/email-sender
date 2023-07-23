#!/bin/sh

screen -dmS WebServer deno run --allow-all web-server.ts $@
