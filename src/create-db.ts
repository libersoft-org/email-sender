import { Client } from 'https://deno.land/x/mysql/mod.ts';

let mysqlClient: Client;
let settings: any;

start();

async function start() {
 loadSettings('settings.json');
 setLog('Creating database "' + settings.mysql.database + '" ...');
 await dbConnect();
 await mysqlClient.query('CREATE DATABASE IF NOT EXISTS ' +  settings.mysql.database);
 await mysqlClient.query('USE ' +  settings.mysql.database);
 const sql = [
  'CREATE TABLE IF NOT EXISTS links (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(64) NOT NULL, link text NOT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP())',
  'CREATE TABLE IF NOT EXISTS visits (id INT PRIMARY KEY AUTO_INCREMENT, id_link INT, ip VARCHAR(64) NOT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP(), FOREIGN KEY (id_link) REFERENCES links(id))',
  'CREATE TABLE IF NOT EXISTS servers (id INT PRIMARY KEY AUTO_INCREMENT, server VARCHAR(128) NOT NULL, port INT NOT NULL DEFAULT 25, secure BOOL NOT NULL DEFAULT 0, auth_user VARCHAR(64) NULL, auth_pass VARCHAR(64) NULL, email VARCHAR(128) NOT NULL, link VARCHAR(128) NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP())',
  'CREATE TABLE IF NOT EXISTS campaigns (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(128) NULL, id_server INT NOT NULL, visible_name VARCHAR(255) NOT NULL, subject TEXT NULL, body TEXT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP(), FOREIGN KEY (id_server) REFERENCES servers(id))',
  'CREATE TABLE IF NOT EXISTS queue (id INT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(128) NOT NULL, id_campaign INT NULL, state TINYINT(1) NOT NULL DEFAULT 0, message TEXT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP(), FOREIGN KEY (id_campaign) REFERENCES campaigns(id))',
  'CREATE TABLE IF NOT EXISTS unsubscribed (id INT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(128) NOT NULL UNIQUE, ip VARCHAR(128) NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP())',
  `CREATE PROCEDURE IF NOT EXISTS createRecipientsTable(IN table_name VARCHAR(255))
  BEGIN
   SET @full_table_name = CONCAT('recipients_', table_name);
   SET @create_table_statement = CONCAT('CREATE TABLE IF NOT EXISTS ', @full_table_name, ' (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE)');
   PREPARE stmt FROM @create_table_statement;
   EXECUTE stmt;
   DEALLOCATE PREPARE stmt;
  END;`,
  `CREATE PROCEDURE IF NOT EXISTS createQueue(IN table_name VARCHAR(255), IN server_id INT, IN campaign_id INT)
  BEGIN
   SET @add_queue = CONCAT('INSERT INTO queue (email, id_server, id_campaign) SELECT email, ', server_id, ', ', campaign_id, ' FROM recipients_', table_name, ' WHERE email NOT IN (SELECT email FROM unsubscribed)');
   PREPARE stmt FROM @add_queue;
   EXECUTE stmt;
   DEALLOCATE PREPARE stmt;
  END;`
 ];
 for (let i = 0; i < sql.length; i++) await mysqlClient.query(sql[i]);
 await dbDisconnect();
 setLog('Done.');
}

async function dbConnect() {
 try {
  mysqlClient = await new Client().connect({
   hostname: settings.mysql.host,
   username: settings.mysql.user,
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
