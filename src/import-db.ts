import { Client } from 'https://deno.land/x/mysql/mod.ts';

let mysqlClient: Client;
let settings: any;

start();

async function start() {
 loadSettings('settings.json');
 if (Deno.args.length != 2) {
  const processName = Deno.mainModule.split('/')[Deno.mainModule.split('/').length - 1];
  setLog('');
  setLog('-----------------------------');
  setLog('E-mail database import script');
  setLog('-----------------------------');
  setLog('');
  setLog('This script imports e-mail database from text file to MySQL / MariaDB table starting with name "recipients_".');
  setLog('');
  setLog('Usage: ' + (processName.endsWith('.ts') ? 'deno run --allow-all ' : '') + processName + ' "[TEXT FILE]" "[TABLE NAME]"');
  setLog('Example: ' + (processName.endsWith('.ts') ? 'deno run --allow-all ' : '') + processName + ' "import-db_example.txt" "my_contacts"');
  setLog('');
  setLog('- This will import e-mail addresses from "import_example.txt" file to "recipients_my_contacts" table');
  setLog('- If table does not exist, it will be created automatically');
  setLog('- Duplicate records are ignored');
  setLog('');
  Deno.exit(1);
 }
 await dbConnect();
 const imp: string[] = Deno.readTextFileSync(Deno.args[0]).split("\n");
 setLog('Creating table "recipients_' + Deno.args[1] + '" ...');
 await mysqlClient.query('CALL createRecipientsTable("' +  Deno.args[1] + '")');
 setLog('Importing data from "' + Deno.args[0] + '" file ...');
 for (let i = 0; i < imp.length; i++) {
  if (imp[i] != '') {
   await mysqlClient.query('INSERT IGNORE INTO recipients_' + Deno.args[1] + ' (email) VALUES (?)', [imp[i]]);
   setLog('Row ' + i + ': "' + imp[i] + '" imported.');
  }
 }
 await dbDisconnect();
 setLog('Done.');
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

function loadSettings(file: string) {
 try {
  settings = JSON.parse(Deno.readTextFileSync(file));
 } catch {
  setLog('Error: Could not load settings from file: ' + file);
  Deno.exit(1);
 }
}

function setLog(message: string) {
 const date: string = new Date().toLocaleString();
 console.log('\x1b[33m' + date + ':\x1b[0m ' + message);
 if (settings.other.log_to_file) Deno.writeTextFileSync(settings.other.log_file, date + ': ' + message + "\n",  { append: true });
}
