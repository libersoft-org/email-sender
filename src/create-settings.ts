import { exists } from 'https://deno.land/std/fs/mod.ts';

const filename = './settings.json';
if (await exists(filename)) {
 console.log();
 console.log('Error: File "' + filename + '" already exists. If you would like to create a new settings file, delete the old one first, please.');
 console.log();
 Deno.exit(1);
}

type SettingsGroup = Record<string, { default: string | number | boolean, question: string }>;

const settings: Record<string, SettingsGroup> = {
 mysql: {
  host: { default: '127.0.0.1', question: 'MySQL server address' },
  user: { default: 'root', question: 'MySQL user' },
  password: { default: '', question: 'MySQL password' },
  database: { default: 'mail', question: 'MySQL database name' }
 },
 other: {
  wait: { default: 10000, question: 'When no more e-mails in queue, wait for (in ms)' },
  log_to_file_sender: { default: true, question: 'Log Mail Sender to file (true / false)' },
  log_file_sender: { default: 'mail-sender{NUM}.log', question: 'Mail Server log file name' },
  log_to_file_import: { default: true, question: 'Log Import DB to file (true / false)' },
  log_file_import: { default: 'import-db.log', question: 'Import DB log file name' },
  log_to_file_web: { default: true, question: 'Log Web Server to file (true / false)' },
  log_file_web: { default: 'web-server.log', question: 'Web Server log file name' }
 }
};

const finalSettings: Record<string, Record<string, string | number | boolean>> = {};

for (const group in settings) {
 finalSettings[group] = {};
 for (const key in settings[group]) {
  const { question, default: defaultValue } = settings[group][key];
  const answer = await prompt(question + (defaultValue != '' ? ' [default: ' + defaultValue + ']' : '') + ':');
  finalSettings[group][key] = answer ? answer : defaultValue;
 }
}

await Deno.writeTextFile(filename, JSON.stringify(finalSettings, null, 1));
console.log();
console.log('Done. Settings file "' +  filename + '" created sucessfully.');
console.log();
