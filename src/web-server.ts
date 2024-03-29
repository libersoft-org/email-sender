import { Application, Router, send } from 'https://deno.land/x/oak/mod.ts';
import { Client, configLogger } from 'https://deno.land/x/mysql/mod.ts';
import { exists } from 'https://deno.land/std/fs/mod.ts';
import {verify, create} from "https://deno.land/x/djwt@v3.0.1/mod.ts";
let settings: any;
let mysqlClient: Client;
const port = 4200;

const jwtKey = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
);

start();
async function start() {
 await configLogger({ enable: false });
 await loadSettings('settings.json');
 const app = new Application();
 const router = new Router();
 processAPI(router);
 processStaticFiles(router);
 app.use(router.routes());
 app.use(router.allowedMethods());
 setLog('Web server is running on port ' + port + ' ...');
 await app.listen({ port: port });
}

function processAPI(router: Router) {
    const routes: { [key: string]: (req: any) => Promise<any> } = {
    '/api/admin/get_campaigns': apiAdminGetCampaigns,
    '/api/admin/get_campaign': apiAdminGetCampaign,
    '/api/admin/add_campaign': apiAdminAddCampaign,
    '/api/admin/send_campaign': apiAdminSendCampaign,
    '/api/admin/copy_campaign': apiAdminCopyCampaign,
    '/api/admin/edit_campaign': apiAdminEditCampaign,
    '/api/admin/delete_campaign': apiAdminDeleteCampaign,
    '/api/admin/get_databases': apiAdminGetDatabases,
    '/api/admin/add_database': apiAdminAddDatabase,
    '/api/admin/import_database': apiAdminImportDatabase,
    '/api/admin/edit_database': apiAdminEditDatabase,
    '/api/admin/delete_database': apiAdminDeleteDatabase,
    '/api/admin/get_links': apiAdminGetLinks,
    '/api/admin/get_link': apiAdminGetLink,
    '/api/admin/add_link': apiAdminAddLink,
    '/api/admin/edit_link': apiAdminEditLink,
    '/api/admin/delete_link': apiAdminDeleteLink,
    '/api/admin/get_servers': apiAdminGetServers,
    '/api/admin/get_server': apiAdminGetServer,
    '/api/admin/add_server': apiAdminAddServer,
    '/api/admin/copy_server': apiAdminCopyServer,
    '/api/admin/edit_server': apiAdminEditServer,
    '/api/admin/delete_server': apiAdminDeleteServer,
    '/api/admin/get_queue': apiAdminGetQueue,
    '/api/admin/get_queue_counts': apiAdminGetQueueCounts,
    '/api/admin/delete_queue': apiAdminDeleteQueue,
    '/api/admin/delete_queue_campaign': apiAdminDeleteQueueCampaign,
    };

    const routesWithoutLogin: { [key: string]: (req: any) => Promise<any> } = {
        '/api/login': apiLogin,
        '/api/unsubscribe': apiUnsubscribe,
    };
  
    for (const route in routes) router.post(route, async (ctx: any) => {
    if (ctx.request.body().type === 'json') {
        var notLoggedResponse = await isLogged(ctx);
        if(notLoggedResponse != null)
            ctx.response.body = notLoggedResponse;
        else
            await processPost(routes, route, ctx);
    } else ctx.response.body = setMessage(2, 'Request is not in JSON format');
    });

    for (const route in routesWithoutLogin) router.post(route, async (ctx: any) => {
        if (ctx.request.body().type === 'json') {
            await processPost(routesWithoutLogin, route, ctx);
        } else ctx.response.body = setMessage(2, 'Request is not in JSON format');
    });
}

function processStaticFiles(router: Router) {
 router.get('/:path*', async (ctx: any) => {
  const webRoot: string = Deno.cwd() + '/web';
  try {
        let path = ctx.request.url.pathname;
        if (path.slice(-6) == 'admin/') path += 'index.html';
        else if (path.slice(-12) == 'unsubscribe/') path += 'index.html';
        else if (path.slice(-1) == '/') path += 'admin/html/login.html';
        if (! await exists(webRoot + path)) 
            path = path.substring(0, path.lastIndexOf('/')) + '/index.html';
        await send(ctx, path, { root: webRoot });
    } catch (e) {
        //console.log(e);
        await send(ctx, 'notfound.html', { root: webRoot });
    }
 });
}

async function processPost(routes: any,route:string, ctx: any){
    const body = ctx.request.body({ type: 'json', limit: 500000000 });
    ctx.response.body = await routes[route]({
        body: await body.value,
        ip: ctx.request.ip
    });
}

async function isLogged(ctx: any){
    const headers = await ctx.request.headers;
    if(headers.has("auth")){
        try{
            const payload = await verify(headers.get("auth"), jwtKey); //verify jwt
            //console.log(payload); 
            return null;
        } catch{

        }
    }
    return setMessage(401, 'Not authorized');
}

async function apiLogin(req: any){
    if(req.body && req.body.username == "admin" && req.body.password == "123456")
    {
        const auth = await create({ alg: "HS512", typ: "JWT" }, { user: req.body.username }, jwtKey);
        return setMessage(1,auth); 
    }
    return setMessage(401, 'Not authorized');
}


async function apiUnsubscribe(req: any) {
 req.body.email = req.body.email.trim();
 if (!req.body.email) return setMessage(3, 'No e-mail address provided.');
 if (await isEmailUnsubscribed(req.body.email)) return setMessage(2, 'This e-mail is already unsubscribed.');
 if (!(await isEmailInDatabase(req.body.email))) return setMessage(3, 'This e-mail is not in our database.');
 await dbQuery('INSERT INTO unsubscribed (email, ip) VALUES (?, ?)', [ req.body.email, req.body.ip ]);
 return setMessage(1, 'Your e-mail has been successfully unsubscribed.');
}

async function isEmailUnsubscribed(email: string) {
 const unsub: any = await dbQuery('SELECT email FROM unsubscribed WHERE email = ?', [ email ]);
 if (unsub != null) return unsub.length > 0;
 else return false;
}

async function isEmailInDatabase(email: string) {
 const tables: any = await dbQuery('SHOW TABLES LIKE "recipients_%"');
 if (tables != null) {
  for (const tableObject of tables) {
   const table = tableObject['Tables_in_mail (recipients_%)'];
   const exists: any = await dbQuery('SELECT email FROM ?? WHERE email = ?', [ table, email ]);
   if (exists.length > 0) return true;
  }
  return false;
 } else return false;
}

async function apiAdminGetCampaigns() {
 return setData(1, await dbQuery('SELECT c.id, c.name, c.id_server, s.server, c.subject, c.body, c.created FROM campaigns c, servers s WHERE s.id = c.id_server ORDER BY c.id DESC'));
}

async function apiAdminGetCampaign(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Campaign ID is missing');
 const res = await dbQuery('SELECT name, id_server, visible_name, subject, body, created FROM campaigns WHERE id = ?', [ req.body.id ]);
 if (res.length != 1) return setMessage(2, 'Campaign with the provided ID does not exist');
 return setData(1, res);
}

async function apiAdminAddCampaign(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'Campaign name is missing');
 if (!isFilled(req.body, 'id_server')) return setMessage(2, 'Server ID is missing');
 const res = await dbQuery('SELECT COUNT(*) AS cnt FROM servers WHERE id = ?', [ req.body.id_server ]);
 if (res[0].cnt != 1) return setMessage(2, 'Server with the provided ID does not exist');
 await dbQuery('INSERT INTO campaigns (name, id_server, visible_name, subject, body) VALUES (?, ?, ?, ?, ?)', [ req.body.name, req.body.id_server, (req.body.visible_name == '' ? null : req.body.visible_name), (req.body.subject == '' ? null : req.body.subject), (req.body.body == '' ? null : req.body.body) ]);
 return setMessage(1, 'New campaign added');
}

async function apiAdminSendCampaign(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Campaign ID is missing');
 if (!isFilled(req.body, 'database')) return setMessage(2, 'Database name is missing');
 const resCampaign = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id = ?', [ req.body.id ]);
 if (resCampaign[0].cnt != 1) return setMessage(2, 'Campaign with the provided ID does not exist');
 const resDatabase = await dbQuery('SHOW TABLES WHERE ?? = ?', [ 'Tables_in_' + settings.mysql.database, 'recipients_' + req.body.database ]);
 if (resDatabase.length != 1) return setMessage(2, 'Database with the provided name does not exist');
 await dbQuery('CALL createQueue(?, ?)', [ req.body.database, req.body.id ]);
 return setMessage(1, 'Campaign added to queue');
}

async function apiAdminCopyCampaign(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Campaign ID is missing');
 const resCount = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id = ?', [ req.body.id ]);
 if (resCount[0].cnt != 1) return setMessage(2, 'Campaign with the provided ID does not exist');
 const resValues = await dbQuery('SELECT name, id_server, visible_name, subject, body FROM campaigns WHERE id = ?', [ req.body.id ]);
 await dbQuery('INSERT INTO campaigns (name, id_server, visible_name, subject, body) VALUES (?, ?, ?, ?, ?)', [ resValues[0].name, resValues[0].id_server, resValues[0].visible_name, resValues[0].subject, resValues[0].body ]);
 return setMessage(1, 'Campaign successfully copied');
}

async function apiAdminEditCampaign(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'Campaign name is missing');
 if (!isFilled(req.body, 'id_server')) return setMessage(2, 'Server ID is missing');
 const resServer = await dbQuery('SELECT COUNT(*) AS cnt FROM servers WHERE id = ?', [ req.body.id_server ]);
 if (resServer[0].cnt != 1) return setMessage(2, 'Server with the provided ID does not exist');
 const resCampaign = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id = ?', [ req.body.id ]);
 if (resCampaign[0].cnt != 1) return setMessage(2, 'Campaign with the provided ID does not exist');
 await dbQuery('UPDATE campaigns SET name = ?, id_server = ?, visible_name = ?, subject = ?, body = ? WHERE id = ?', [ req.body.name, req.body.id_server, (req.body.visible_name == '' ? null : req.body.visible_name), (req.body.subject == '' ? null : req.body.subject), (req.body.body == '' ? null : req.body.body), req.body.id ]);
 return setMessage(1, 'Campaign edited');
}

async function apiAdminDeleteCampaign(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Campaign ID is missing');
 const cnt = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id = ?', [ req.body.id.toString() ]);
 if (cnt[0].cnt != 1) return setMessage(2, 'Campaign with the provided ID does not exist');
 const cnt_queue = await dbQuery('SELECT COUNT(*) AS cnt FROM queue WHERE id_campaign = ?', [ req.body.id.toString() ]);
 if (cnt_queue[0].cnt != 0) return setMessage(2, 'Cannot delete this campaign, some e-mails of this campaign are still in queue'); 
 try {
  await dbQuery('DELETE FROM campaigns WHERE id = ?', [ req.body.id.toString() ]);
  return setMessage(1, 'Campaign deleted');
 } catch {
  return setMessage(2, 'Unable to delete this campaign');
 }
}

async function apiAdminGetDatabases() {
 const databases = await dbQuery('SHOW TABLES LIKE "recipients_%"');
 const dbs = [];
 for (let i = 0; i < databases.length; i++) {
  for (const k in databases[i]) {
   const count = await dbQuery('SELECT COUNT(*) AS cnt FROM ??', [ databases[i][k] ]);
   dbs.push({ database: databases[i][k].substring(11), count: count[0].cnt });
  }
 }
 return setData(1, dbs);
}

async function apiAdminAddDatabase(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'Database name not defined');
 const regex = /^[a-z0-9_]+$/;
 if (!regex.test(req.body.name)) return setMessage(2, 'Database name not defined');
 await dbQuery('CALL createRecipientsTable(?)', [ req.body.name ]);
 return setMessage(1, 'Database added');
}

async function apiAdminImportDatabase(req: any) {
 const table = await dbQuery('SHOW TABLES WHERE ?? = ?', [ 'Tables_in_' + settings.mysql.database, 'recipients_' + req.body.name ]);
 if (table.length != 1) return setMessage(2, 'The database with the provided name not found');
 req.body.content = req.body.content.replaceAll("\r", '');
 const emails = req.body.content.split("\n");
 const queries: string[] = []
 for (let i = 0; i < emails.length; i++) {
  emails[i] = emails[i].trim();
  if (emails[i] != '') queries.push('INSERT IGNORE INTO recipients_' + req.body.name + ' (email) VALUES ("' + emails[i] + '")');
 }
 try {
  await dbMultiQuery(queries);
  return setMessage(1, 'Database imported');
 } catch (ex) {
  setLog('Error:' + ex);
  return setMessage(2, 'Error during import'); 
 }
}

async function apiAdminEditDatabase(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'New database name not defined');
 if (!isFilled(req.body, 'name_old')) return setMessage(2, 'Old database name not defined');
 const table = await dbQuery('SHOW TABLES WHERE ?? = ?', [ 'Tables_in_' + settings.mysql.database, 'recipients_' + req.body.name_old ]);
 if (table.length != 1) return setMessage(2, 'The old database with the provided name not found');
 const regex = /^[a-z0-9_]+$/;
 if (!regex.test(req.body.name)) return setMessage(2, 'New database name can contain only lower case letters of English alphabet, numbers and underscores');
 await dbQuery('RENAME TABLE ?? TO ??', [ 'recipients_' + req.body.name_old, 'recipients_' + req.body.name ]);
 return setMessage(1, 'Database name changed');
}

async function apiAdminDeleteDatabase(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'Database name is missing');
 const tables = await dbQuery('SHOW TABLES WHERE ?? = ?', [ 'Tables_in_' + settings.mysql.database, 'recipients_' + req.body.name ]);
 if (tables.length != 1) return setMessage(2, 'Database with the provided name does not exist');
 try {
  await dbQuery('DROP TABLE ??', [ 'recipients_' + req.body.name ]);
  return setMessage(1, 'Database deleted');
 } catch {
  return setMessage(2, 'Unable to delete this database');
 }
}

async function apiAdminGetLinks() {
 return setData(1, await dbQuery('SELECT l.id, l.name, l.link, COUNT(v.id) AS visits, COUNT(DISTINCT v.ip) AS visits_unique, l.created FROM links l LEFT JOIN visits v ON l.id = v.id_link GROUP BY l.id'));
}

async function apiAdminGetLink(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Link ID is missing');
 const res = await dbQuery('SELECT name, link, created FROM links WHERE id = ?', [ req.body.id ]);
 if (res.length != 1) return setMessage(2, 'Link with the provided ID does not exist');
 return setData(1, res);
}

async function apiAdminAddLink(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'Name is missing');
 const regex = /^[a-z0-9]+$/;
 if (!regex.test(req.body.name)) return setMessage(2, 'Name can contain only lower case letters of English alphabet and numbers');
 if (!isFilled(req.body, 'link')) return setMessage(2, 'Destination link is missing');
 await dbQuery('INSERT INTO links (name, link) VALUES (?, ?)', [ req.body.name, req.body.link ]);
 return setMessage(1, 'New link added');
}

async function apiAdminEditLink(req: any) {
 if (!isFilled(req.body, 'name')) return setMessage(2, 'Name is missing');
 const regex = /^[a-z0-9]+$/;
 if (!regex.test(req.body.name)) return setMessage(2, 'Name can contain only lower case letters of English alphabet and numbers');
 if (!isFilled(req.body, 'link')) return setMessage(2, 'Destination link is missing');
 const resCount = await dbQuery('SELECT COUNT(*) AS cnt FROM links WHERE id = ?', [ req.body.id ]);
 if (resCount[0].cnt != 1) return setMessage(2, 'Link with the provided ID does not exist');
 await dbQuery('UPDATE links SET name = ?, link = ? WHERE id = ?', [ req.body.name, req.body.link, req.body.id ]);
 return setMessage(1, 'Link edited');
}

async function apiAdminDeleteLink(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Link ID is missing');
 const cnt = await dbQuery('SELECT COUNT(*) AS cnt FROM links WHERE id = ?', [ req.body.id.toString() ]);
 if (cnt[0].cnt != 1) return setMessage(2, 'Link with the provided ID does not exist');
 try {
  await dbQuery('DELETE FROM visits WHERE id_link = ?', [ req.body.id.toString() ]);
  await dbQuery('DELETE FROM links WHERE id = ?', [ req.body.id.toString() ]);
  return setMessage(1, 'Link deleted');
 } catch {
  return setMessage(2, 'Unable to delete this link');
 }
}

async function apiAdminGetServers() {
 return setData(1, await dbQuery('SELECT id, server, email, created FROM servers ORDER BY id DESC'));
}

async function apiAdminGetServer(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Server ID is missing');
 const server = await dbQuery('SELECT server, port, secure, auth_user, auth_pass, email, link, footer, created FROM servers WHERE id = ?', [ req.body.id ]);
 if (server.length != 1) return setMessage(2, 'Server with the provided ID does not exist');
 return setData(1, server);
}

async function apiAdminAddServer(req: any) {
 if (!isFilled(req.body, 'hostname')) return setMessage(2, 'Server hostname is missing');
 if (!isFilled(req.body, 'port')) return setMessage(2, 'Server port is missing');
 const port = parseInt(req.body.port);
 if (!Number.isInteger(port)) return setMessage(2, 'Server port has to be a whole number');
 if (port < 0 || port > 65535) return setMessage(2, 'Server port has to be in range of 0 - 65535');
 if (!isFilled(req.body, 'email')) return setMessage(2, 'E-mail address is missing');
 if (!isFilled(req.body, 'link')) return setMessage(2, 'Web address for links address is missing');
 await dbQuery('INSERT INTO servers (server, port, secure, auth_user, auth_pass, email, link, footer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [ req.body.hostname, port, req.body.secure, (req.body.user == '' ? null : req.body.user), (req.body.password == '' ? null : req.body.password), req.body.email, req.body.link, (req.body.footer == '' ? null : req.body.footer) ]);
 return setMessage(1, 'New server added');
}

async function apiAdminCopyServer(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Server ID is missing');
 const resCount = await dbQuery('SELECT COUNT(*) AS cnt FROM servers WHERE id = ?', [ req.body.id ]);
 if (resCount[0].cnt != 1) return setMessage(2, 'Server with the provided ID does not exist');
 const resValues = await dbQuery('SELECT server, port, secure, auth_user, auth_pass, email, link, footer FROM servers WHERE id = ?', [ req.body.id ]);
 await dbQuery('INSERT INTO servers (server, port, secure, auth_user, auth_pass, email, link, footer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [ resValues[0].server, resValues[0].port, resValues[0].secure, resValues[0].auth_user, resValues[0].auth_pass, resValues[0].email, resValues[0].link, resValues[0].footer ]);
 return setMessage(1, 'Server successfully copied');
}

async function apiAdminEditServer(req: any) {
 if (!isFilled(req.body, 'hostname')) return setMessage(2, 'Server hostname is missing');
 if (!isFilled(req.body, 'port')) return setMessage(2, 'Server port is missing');
 const port = parseInt(req.body.port);
 if (!Number.isInteger(port)) return setMessage(2, 'Server port has to be a whole number');
 if (port < 0 || port > 65535) return setMessage(2, 'Server port has to be in range of 0 - 65535');
 if (!isFilled(req.body, 'email')) return setMessage(2, 'E-mail address is missing');
 if (!isFilled(req.body, 'link')) return setMessage(2, 'Web address for links address is missing');
 const resCount = await dbQuery('SELECT COUNT(*) AS cnt FROM servers WHERE id = ?', [ req.body.id ]);
 if (resCount[0].cnt != 1) return setMessage(2, 'Server with the provided ID does not exist');
 await dbQuery('UPDATE servers SET server = ?, port = ?, secure = ?, auth_user = ?, auth_pass = ?, email = ?, link = ?, footer = ? WHERE id = ?', [ req.body.hostname, port, req.body.secure, (req.body.user == '' ? null : req.body.user), (req.body.password == '' ? null : req.body.password), req.body.email, req.body.link, (req.body.footer == '' ? null : req.body.footer), req.body.id ]);
 return setMessage(1, 'Server edited');
}

async function apiAdminDeleteServer(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Server ID is missing');
 const cnt = await dbQuery('SELECT COUNT(*) AS cnt FROM servers WHERE id = ?', [ req.body.id.toString() ]);
 if (cnt[0].cnt != 1) return setMessage(2, 'Server with the provided ID does not exist');
 const cnt_campaigns = await dbQuery('SELECT COUNT(*) AS cnt FROM campaigns WHERE id_server = ?', [ req.body.id.toString() ]);
 if (cnt_campaigns[0].cnt != 0) return setMessage(2, 'Cannot delete this server, some campaigns are still using it');
 try {
  await dbQuery('DELETE FROM servers WHERE id = ?', [ req.body.id.toString() ]);
  return setMessage(1, 'Server deleted');
 } catch {
  return setMessage(2, 'Unable to delete this server');
 }
}

async function apiAdminGetQueue() {
 return setData(1, await dbQuery('SELECT q.id_campaign, c.name FROM queue q, campaigns c WHERE q.id_campaign = c.id GROUP BY q.id_campaign ORDER BY q.id DESC'));
}

async function apiAdminGetQueueCounts(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Campaign ID is missing');
 return setData(1, await dbQuery('SELECT state, COUNT(*) AS cnt FROM queue WHERE id_campaign = ? GROUP BY state ORDER BY state', [ req.body.id ]));
}

async function apiAdminDeleteQueue(req: any) {
 await dbQuery('DELETE FROM queue', [ req.body.id ]);
 return setMessage(1, 'Queue deleted');
}

async function apiAdminDeleteQueueCampaign(req: any) {
 if (!isFilled(req.body, 'id')) return setMessage(2, 'Campaign ID is missing');
 const cnt = await dbQuery('SELECT COUNT(*) AS cnt FROM queue WHERE id_campaign = ?', [ req.body.id ]);
 if (cnt[0].cnt == 0) return setMessage(2, 'The campaign with the provided ID is not in queue');
 if (isFilled(req.body, 'status')) {
  await dbQuery('DELETE FROM queue WHERE id_campaign = ? AND status = ?', [ req.body.id, req.body.status ]);
  return setMessage(1, 'Campaign messages with the provided status code deleted from queue');
 } else {
  await dbQuery('DELETE FROM queue WHERE id_campaign = ?', [ req.body.id ]);
  return setMessage(1, 'Campaign messages deleted from queue');
 }
}

function isFilled(object: any, propertyName: string): boolean {
 return Object.prototype.hasOwnProperty.call(object, propertyName) && object[propertyName] != '';
}

function setMessage(status: number, message: string) {
 return { status: status, message: message };
}

function setData(status: number, data: any) {
 return { status: status, data: data };
}

async function dbConnect() {
 try {
  mysqlClient = await new Client().connect({
   hostname: settings.mysql.host,
   username: settings.mysql.user,
   db: settings.mysql.database,
   password: settings.mysql.password,
   debug: false
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

async function dbMultiQuery(query: string[]) {
 try {
  await dbConnect();
  for (let i = 0; i < query.length; i++) await mysqlClient.query(query[i]);
  await dbDisconnect();
 } catch (ex) {
  setLog('Error: MySQL query failed.');
  setLog('Query: ' + query);
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
