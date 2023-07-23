import { Application, Router, send } from 'https://deno.land/x/oak/mod.ts';
import { Client } from 'https://deno.land/x/mysql/mod.ts';
import { exists } from 'https://deno.land/std/fs/mod.ts';

let settings: any;
let mysqlClient: Client;

start();

async function start() {
 await loadSettings('settings.json');
 await loadWebServer();
}

async function loadWebServer() {
 const app = new Application();
 const router = new Router();
 processAPI(router);
 processStaticFiles(router);
 app.use(router.routes());
 app.use(router.allowedMethods());
 setLog('Web server is running on port 80 ...');
 await app.listen({ port: 80 });
}

function processAPI(router: Router) {
 router.post('/api/unsubscribe', async (ctx: any) => await apiUnsubscribe(ctx));
 router.post('/api/admin/get_campaigns', async (ctx: any) => await apiAdminGetCampaigns(ctx));
 /*
 router.post('/api/admin/create_campaign', async (ctx: any) => {
  // const campaign = await createCampaign(context.request.body);
  ctx.response.body = { status: 1, message: 'Campaign created' };
 });
 */
 router.post('/api/admin/delete_campaign', async (ctx: any) => await apiAdminDeleteCampaign(ctx));
 router.post('/api/admin/get_databases', async (ctx: any) => await apiAdminGetDatabases(ctx));
 router.post('/api/admin/delete_database', async (ctx: any) => await apiAdminDeleteDatabase(ctx));
 router.post('/api/admin/get_servers', async (ctx: any) => await apiAdminGetServers(ctx));
 router.post('/api/admin/add_server', async (ctx: any) => await apiAdminAddServer(ctx));
 router.post('/api/admin/delete_server', async (ctx: any) => await apiAdminDeleteServer(ctx));
}

function processStaticFiles(router: Router) {
 router.get('/:path*', async (ctx: any) => {
  const webRoot: string = Deno.cwd() + '/web';
  try {
   let path = ctx.request.url.pathname;
   if (path.slice(-1) == '/') path += 'index.html';
   else if (! await exists(webRoot + path)) path = path.substring(0, path.lastIndexOf('/')) + '/index.html';
   await send(ctx, path, { root: webRoot });
  } catch {
   await send(ctx, 'notfound.html', { root: webRoot });
  }
 });
}

async function apiUnsubscribe(ctx: any) {
 const body: any = await ctx.request.body().value;
 body.email = body.email.trim();
 if (!body.email) return { type: 2, message: 'No e-mail address provided.' };
 if (await isEmailUnsubscribed(body.email)) ctx.response.body = { type: 1, message: 'This e-mail is already unsubscribed.' };
 if (!(await isEmailInDatabase(body.email))) ctx.response.body = { type: 2, message: 'This e-mail is not in our database.' };
 await dbQuery('INSERT INTO unsubscribed (email, ip) VALUES (?, ?)', [body.email, ctx.request.ip]);
 ctx.response.body = { type: 0, message: 'Your e-mail has been successfully unsubscribed.' }
}

async function isEmailUnsubscribed(email: string) {
 const unsub: any = await dbQuery('SELECT email FROM unsubscribed WHERE email = ?', [email]);
 if (unsub != null) return unsub.length > 0;
 else return false;
}

async function isEmailInDatabase(email: string) {
 const tables: any = await dbQuery('SHOW TABLES LIKE "recipients_%"');
 if (tables != null) {
  for (const tableObject of tables) {
   const table = tableObject['Tables_in_mail (recipients_%)'];
   const exists: any = await dbQuery('SELECT email FROM ?? WHERE email = ?', [table, email]);
   if (exists.length > 0) return true;
  }
  return false;
 } else return false;
}

async function apiAdminGetCampaigns(ctx: any) {
 const campaigns = await dbQuery('SELECT c.id, c.name, c.id_server, s.server, c.subject, c.body, c.created FROM campaigns c, servers s WHERE s.id = c.id_server ORDER BY c.id DESC');
 ctx.response.body = campaigns;
}

async function apiAdminGetDatabases(ctx: any) {
 const databases = await dbQuery('SHOW TABLES LIKE "recipients_%"');
 const dbs = [];
 for (let i = 0; i < databases.length; i++) {
  for (let k in databases[i]) {
   const count = await dbQuery('SELECT COUNT(*) AS cnt FROM ' + databases[i][k]);
   dbs.push({ database: databases[i][k].substring(11), count: count[0].cnt });
  }
 }
 ctx.response.body = dbs;
}

async function apiAdminDeleteDatabase(ctx: any) {
 if (ctx.request.body().type === 'json') {
  const req = await ctx.request.body().value;
  if (req.hasOwnProperty('name')) {
   const tables = await dbQuery('SHOW TABLES WHERE Tables_in_' + settings.mysql.database + ' LIKE "recipients_' + req.name + '"');
   if (tables.length == 1) {
    try {
     await dbQuery('DROP TABLE recipients_' + req.name);
     ctx.response.body = { status: 1, message: 'Database deleted' };
    } catch {
     ctx.response.body = { status: 2, message: 'Unable to delete this database' };
    }
   } else ctx.response.body = { status: 2, message: 'Database with the provided name does not exist' };
  } else ctx.response.body = { status: 2, message: 'Database name is missing' };
 } else ctx.response.body = { status: 2, message: 'Request is not in JSON format' };
}


async function apiAdminGetServers(ctx: any) {
 const servers = await dbQuery('SELECT id, server, email, created FROM servers ORDER BY id DESC');
 ctx.response.body = servers;
}

async function apiAdminAddServer(ctx: any) {
 if (ctx.request.body().type === 'json') {
  const req = await ctx.request.body().value;
  if (req.hasOwnProperty('hostname') && req.hostname != '') {
   if (req.hasOwnProperty('port') && req.port != '') {
    const port = parseInt(req.port);
    if (Number.isInteger(port)) {
     if (port >= 0 && port <= 65535) {
      if (req.hasOwnProperty('email') && req.email != '') {
       if (req.hasOwnProperty('link') && req.link != '') {
        await dbQuery('INSERT INTO servers (server, port, secure, auth_user, auth_pass, email, link) VALUES (?, ?, ?, ?, ?, ?, ?)', [ req.hostname, port, (req.secure == '1' ? true : false), (req.user == '' ? null : req.user), (req.password == '' ? null : req.password), req.email, req.link ]);
        ctx.response.body = { status: 1, message: 'New server added' }
       } else ctx.response.body = { status: 2, message: 'Web address for links address is missing' };
      } else ctx.response.body = { status: 2, message: 'E-mail address is missing' };
     } else ctx.response.body = { status: 2, message: 'Server port has to be in range of 0 - 65535' };
    } else ctx.response.body = { status: 2, message: 'Server port has to be a whole number' };
   } else ctx.response.body = { status: 2, message: 'Server port is missing' }; 
  } else ctx.response.body = { status: 2, message: 'Server hostname is missing' };
 } else ctx.response.body = { status: 2, message: 'Request is not in JSON format' };
}

async function apiAdminDeleteCampaign(ctx: any) {
 if (ctx.request.body().type === 'json') {
  const req = await ctx.request.body().value;
  if (req.hasOwnProperty('id')) {
   const cnt = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id = ?', req.id.toString());
   if (cnt[0].cnt == 1) {
    const cnt_queue = await dbQuery('SELECT COUNT(*) AS cnt FROM queue WHERE id_campaign = ?', req.id.toString());
    if (cnt_queue[0].cnt == 0) {
     try {
      await dbQuery('DELETE FROM campaigns WHERE id = ?', req.id.toString());
      ctx.response.body = { status: 1, message: 'Campaign deleted' };
     } catch {
      ctx.response.body = { status: 2, message: 'Unable to delete this campaign' };
     }
    } else ctx.response.body = { status: 2, message: 'Cannot delete this campaign, some e-mails of this campaign are still in queue' }; 
   } else ctx.response.body = { status: 2, message: 'Campaign with the provided ID does not exist' };
  } else ctx.response.body = { status: 2, message: 'Campaign ID is missing' };
 } else ctx.response.body = { status: 2, message: 'Request is not in JSON format' };
}

async function apiAdminDeleteServer(ctx: any) {
 if (ctx.request.body().type === 'json') {
  const req = await ctx.request.body().value;
  if (req.hasOwnProperty('id')) {
   const cnt = await dbQuery('SELECT COUNT(*) AS cnt FROM servers WHERE id = ?', req.id.toString());
   if (cnt[0].cnt == 1) {
    const cnt_campaigns = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id_server = ?', req.id.toString());
    if (cnt_campaigns[0].cnt == 0) {
     try {
      await dbQuery('DELETE FROM servers WHERE id = ?', req.id.toString());
      ctx.response.body = { status: 1, message: 'Server deleted' };
     } catch {
      ctx.response.body = { status: 2, message: 'Unable to delete this server' };
     }
    } else ctx.response.body = { status: 2, message: 'Cannot delete this server, some campaigns are still using it' };
   } else ctx.response.body = { status: 2, message: 'Server with the provided ID does not exist' };
  } else ctx.response.body = { status: 2, message: 'Server ID is missing' };
 } else ctx.response.body = { status: 2, message: 'Request is not in JSON format' };
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

async function dbQuery(query: string, params: any[] = []) {
 try {
  await dbConnect();
  const res: any = await mysqlClient.query(query, params);
  await dbDisconnect();
  return res;
 } catch (ex) {
  setLog('Error: MySQL query failed.');
  setLog('Query: ' + query);
  setLog('Parameters: ' + params);
  setLog('Exception: ' + ex);
 }
}

async function loadSettings(file: string) {
 try {
  settings = JSON.parse(await Deno.readTextFile(file));
 } catch {
  setLog('Error: Could not load settings from file: ' + file);
  Deno.exit(1);
 }
}

function setLog(message: string) {
 const date: string = new Date().toLocaleString();
 console.log('\x1b[33m' + date + ':\x1b[0m ' + message);
 if (settings.other.log_to_file_web) Deno.writeTextFileSync(settings.other.log_file_web, date + ': ' + message + '\n',  { append: true });
}
