# E-mail Sender - installation manual and basic usage

## Requirements

- Linux server for E-mail Sender
- At least one e-mail server (not on the same system as E-mail Sender)

## Installation

1. Install [**Deno**](https://deno.land), [**MariaDB**](https://mariadb.org/) and **screen** on your system:

a) APT based Linux (Debian, Ubuntu, Mint, Knoppix, ...):

```sh
apt update
apt -y upgrade
apt -y install curl unzip mariadb-server mariadb-client screen
curl -Lo "deno.zip" "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip"
unzip -d /usr/local/bin deno.zip
deno upgrade
```

b) DNF based Linux (CentOS, Fedora, Red Hat, SUSE, ...):

```sh
dnf update
dnf install curl unzip mariadb-server mariadb-client screen
curl -Lo "deno.zip" "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip"
unzip -d /usr/local/bin deno.zip
deno upgrade
```

2. Set your password on MariaDB database:

```sh
mysql -u root
```

... and use these commands (replace **[YOUR PASSWORD]** with your actual password)

```sh
ALTER USER 'root'@'localhost' IDENTIFIED BY '[YOUR PASSWORD]';
FLUSH PRIVILEGES;
EXIT;
```

3. Download the latest version of E-Mail Sender on your system:

```sh
git clone https://github.com/libersoft-org/email-sender.git
cd email-sender/src
```

4. Create your settings file:

```sh
./create-settings.sh
```

... and fill your settings. This will create the **settings.json** file that you can edit later if needed.

5. Create your database:

```sh
./create-db.sh
```

6. Run the **Mail Sender** and **Web Server** in screen:

```sh
./mail-sender-screen.sh
./web-server-screen.sh
```

If you don't want to run the **Mail Sender** or **Web Server** in screen, just use **./mail-sender.sh** or **./web-server.sh** instead.

7. You can access the screen:

**Mail Sender:**
```sh
screen -r Mail Sender
```

**Web Server:**
```sh
screen -r WebServer
```

You can leave screen by **CTRL+A** and then **CTRL+D**

## Usage:

- Access your Web UI: **http://[YOUR_SERVER]/admin/**
- Access the unsubscribe page: **http://[YOUR_SERVER]/unsubscribe/**

(replace **[YOUR_SERVER]** with your actual web server address)
