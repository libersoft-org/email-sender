#!/bin/sh

if [ ! -d "bin/" ]; then
 mkdir bin
fi
deno compile --allow-all src/mail-sender.ts
deno compile --allow-all src/web-server.ts
deno compile --allow-all src/create-db.ts
deno compile --allow-all src/create-settings.ts
mv ./mail-sender bin/
mv ./web-server bin/
mv ./create-db bin/
mv ./create-settings bin/
cp -r src/web/ bin/
cat << EOF > bin/web-server-screen.sh
#!/bin/sh

screen -dmS WebServer ./web-server \$@
EOF
chmod +x bin/web-server-screen.sh
cat << EOF > bin/mail-sender-screen.sh
#!/bin/sh

screen -dmS MailSender ./mail-sender \$@
EOF
chmod +x bin/mail-sender-screen.sh
