#!/bin/sh

screen -dmS MailSender deno run --allow-all mail-sender.ts $@
