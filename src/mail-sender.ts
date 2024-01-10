import { Client } from 'https://deno.land/x/mysql/mod.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts';
import { sleep } from "https://deno.land/x/sleep/mod.ts";

interface MailServer { server: string; port: number; secure: boolean; auth_user: string; auth_pass: string; email: string, link: string; }
interface Campaign { visible_name: string; body: string; subject: string; }
const campaigns: Record<number, Campaign> = {};
let mailServer: MailServer;
let settings: any;
let mysqlClient: Client;
let smtpClient: SMTPClient;

start();

async function start() {
 loadSettings('settings.json');
 if (Deno.args.length != 1) {
  setLog('Error: Missing command line argument - server ID.');
 } else {
  await dbConnect();
  const mailServers: MailServer[] = await mysqlClient.query('SELECT server, port, secure, auth_user, auth_pass, email, link FROM servers WHERE id = ?', [Deno.args[0]]);
  await dbDisconnect();
  if (mailServers.length == 1) {
   mailServer = mailServers[0];
   sendMailsLoop();
  } else {
   setLog('Error: No server found in database with the provided ID.');
  }
 }
}

function loadSettings(file: string) {
 try {
  settings = JSON.parse(Deno.readTextFileSync(file));
 } catch {
  setLog('Error: Could not load settings from file: ' + file);
  Deno.exit(1);
 }
}

async function dbConnect() {
 try {
  mysqlClient = await new Client().connect({
   hostname: settings.mysql.host,
   username: settings.mysql.user,
   db: settings.mysql.database,
   password: settings.mysql.password,
  });
 } catch {
  setLog('Error: Could not connect to the MySQL server.');
  Deno.exit(1);
 }
}

async function dbDisconnect() {
 try {
  await mysqlClient.close();
 } catch {
  setLog('Error: Could not disconnect from the MySQL server.');
  Deno.exit(1);
 }
}

function mailConnect() {
 try {
  smtpClient = (mailServer.auth_user != null || mailServer.auth_user != '') ? new SMTPClient({
   connection: {
    hostname: mailServer.server,
    port: mailServer.port,
    tls: mailServer.secure,
    auth: {
     username: mailServer.auth_user,
     password: mailServer.auth_pass
    }
   }
  }) : new SMTPClient({
   connection: {
    hostname: mailServer.server,
    port: mailServer.port,
    tls: mailServer.secure,
   }
  });
 } catch {
  setLog('Error: Could not connect to the mail server.');
  Deno.exit(1);
 }
}

async function mailDisconnect() {
 try {
    if(smtpClient.is)
  await smtpClient.close();
 } catch {
  setLog('Error: Could not disconnect from the mail server.');
  Deno.exit(1);
 }
}

async function sendMail(id: number, from_name: string, from_email: string, to_name: string, to_email: string, subject: string, body: string) {
 try {
  await smtpClient.send({
   from: (from_name != '' || from_name != null ? from_name + ' ' : '') + '<' + from_email + '>',
   to: (to_name != '' || to_name != null ? to_name + ' ' : '') + '<' + to_email + '>',
   subject: subject,
   html: body
  });
  await mysqlClient.execute('UPDATE queue SET state = 1 WHERE id = ?', [id]);
  setLog(to_email + ' - OK');
 } catch (error) {
  await mysqlClient.execute('UPDATE queue SET state = 2, message = ? WHERE id = ?', [error.message, id]);
  setLog(to_email + ' - ERROR - ' + error.message);
 }
}

async function sendMailsLoop() {
 while (true) {
  await dbConnect();
  setLog('Loading e-mails to send ...');
  const toSend = await mysqlClient.query('SELECT q.id, q.email, q.id_campaign FROM queue q, campaigns c WHERE q.state = 0 AND c.id = q.id_campaign AND c.id_server = ?', [Deno.args[0]]);
  if (toSend.length > 0) {
    mailConnect();
   setLog('Found ' + toSend.length + ' e-mail' + (toSend.length != 1 ? 's' : '') + ' to send ...');
   for (let i = 0; i < toSend.length; i++) {
    if (campaigns[toSend[i].id_campaign] === undefined) {
     const camp = await mysqlClient.query('SELECT visible_name, subject, body FROM campaigns WHERE id = ?', [toSend[i].id_campaign]);
     campaigns[toSend[i].id_campaign] = {
      visible_name: camp[0].visible_name,
      body: camp[0].body,
      subject: camp[0].subject
     }
    }
    await sendMail(
     toSend[i].id,
     campaigns[toSend[i].id_campaign].visible_name,
     mailServer.email,
     '',
     toSend[i].email,
     campaigns[toSend[i].id_campaign].subject,
     campaigns[toSend[i].id_campaign].body.replace('{unsubscribe}', mailServer.link + (!mailServer.link.endsWith('/') ? '/' : '') + 'unsubscribe?email=' + toSend[i].email)
    );
   }
    await mailDisconnect();
  } else {
   setLog('Nothing to send - waiting for ' + settings.other.wait / 1000 + ' secs ...');
   await sleep(settings.other.wait / 1000);
  }
  await dbDisconnect();
 }
}

function setLog(message: string) {
 const date: string = new Date().toLocaleString();
 console.log('\x1b[33m' + date + ':\x1b[0m ' + message);
 if (settings.other.log_to_file_sender) Deno.writeTextFileSync(settings.other.log_file_sender.replace('{NUM}', Deno.args.length == 1 ? '_' + Deno.args[0] : ''), date + ': ' + message + "\n",  { append: true });
}
