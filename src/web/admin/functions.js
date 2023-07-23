const pageName = 'E-mail Sender';
let pages;

window.onload = async () => {
 let pg = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
 await getMenu();
 getReload(pg);
 window.addEventListener('popstate', async function(e) { getReload(pg); });
}

async function getReload(page) {
 window.history.replaceState('', '', page == '' ? '' : page);
 await getPageContent(page);
}

async function getPage(page) {
 window.history.pushState('', '', page == '' ? '/' : page);
 await getPageContent(page);
}

async function getPageContent(page) {
 if (page == '') page = 'campaigns';
 let content = '';
 if (document.querySelectorAll('#menu .items a .item.active').length == 1) document.querySelectorAll('#menu .items a .item.active')[0].classList.remove('active');
 const pages = JSON.parse(await getFileContent('pages.json'));
 if (page in pages) {
  document.title = pageName + ' - ' + pages[page].label;
  if (document.querySelector('#menu .items a .item.menu-' + page)) document.querySelector('#menu .items a .item.menu-' + page).classList.add('active');
  content = await getFileContent('html/' + page + '.html');
 } else {
  document.title = pageName + ' - ' + pages['notfound'].label;
  content = await getFileContent('html/notfound.html');
 }
 document.querySelector('#content').innerHTML = content;
 if (page == 'campaigns') await getCampaigns();
 if (page == 'databases') await getDatabases();
 if (page == 'links') await getLinks();
 if (page == 'servers') await getServers();
 if (page == 'queue') await getQueue();
}

async function getMenu() {
 const temp = await getFileContent('html/temp-menu.html');
 const pages = JSON.parse(await getFileContent('pages.json'));
 let menu_html = '';
 for (const page in pages) {
  if (pages[page].menu) {
   const button_html = translate(temp, {
    '{CLASS}': page,
    '{NAME}': page == 'about' ? '' : page,
    '{LABEL}': pages[page].label
   });
   menu_html += button_html + "\n";
  }
 }
 document.querySelector('#menu .items').innerHTML = menu_html + "\n" + '<a onclick="logout()"><div class="item menu-logout">Logout</div></a>';
}

async function getCampaigns() {
 const temp = await getFileContent('html/temp-campaigns-row.html');
 const campaigns = await getAPI('/api/admin/get_campaigns');
 let campaigns_html = '';
 for (let i = 0; i < campaigns.length; i++) {
  campaigns_html += translate(temp, {
   '{ID}': campaigns[i].id,
   '{NAME}': campaigns[i].name,
   '{SERVER}': campaigns[i].server + ' (' + campaigns[i].id_server + ')',
   '{CREATED}': new Date(campaigns[i].created).toLocaleString()
  });
 }
 document.querySelector('#content tbody').innerHTML = campaigns_html;
 document.querySelector('.loader').remove();
}

async function getDatabases() {
 const temp = await getFileContent('html/temp-databases-row.html');
 const databases = await getAPI('/api/admin/get_databases');
 let databases_html = '';
 for (let i = 0; i < databases.length; i++) {
  databases_html += translate(temp, {
   '{NAME}': databases[i].database,
   '{CONTACTS}': databases[i].count,
  });
 }
 document.querySelector('#content tbody').innerHTML = databases_html;
 document.querySelector('.loader').remove();
}

async function getLinks() {
 const temp = await getFileContent('html/temp-links-row.html');
 const links = await getAPI('/api/admin/get_links');
 let links_html = '';
 for (let i = 0; i < links.length; i++) {
  links_html += translate(temp, {
   '{ID}': links[i].id,
   '{NAME}': links[i].name,
   '{CREATED}': new Date(links[i].created).toLocaleString()
  });
 }
 document.querySelector('#content tbody').innerHTML = links_html;
 document.querySelector('.loader').remove();
}

async function getServers() {
 const temp = await getFileContent('html/temp-servers-row.html');
 const servers = await getAPI('/api/admin/get_servers');
 let servers_html = '';
 for (let i = 0; i < servers.length; i++) {
  servers_html += translate(temp, {
   '{ID}': servers[i].id,
   '{NAME}': servers[i].server,
   '{EMAIL}': servers[i].email,
   '{CREATED}': new Date(servers[i].created).toLocaleString()
  });
 }
 document.querySelector('#content tbody').innerHTML = servers_html;
 document.querySelector('.loader').remove();
}

async function getQueue() {
 const temp = await getFileContent('html/temp-queue-row.html');
 const queue = await getAPI('/api/admin/get_queue');
 let queue_html = '';
 for (let i = 0; i < queue.length; i++) {
  queue_html += translate(temp, {
   '{ID}': queue[i].id,
   '{CAMPAIGN}': queue[i].campaign,
   '{STATE}': queue[i].state,
  });
 }
 document.querySelector('#content tbody').innerHTML = queue_html;
 document.querySelector('.loader').remove();
}

async function addCampaignModal() {
 await getModal('New campaign', await getFileContent('html/temp-campaigns-add.html'));
 const servers = await getAPI('/api/admin/get_servers');
 for (let i = 0; i < servers.length; i++) {
  const opt = document.createElement('option');
  opt.value = servers[i].id;
  opt.innerHTML = servers[i].server;
  document.querySelector('.modal .body #form-server').appendChild(opt);
 }
}

async function addDatabaseModal() {
 await getModal('New database', await getFileContent('html/temp-databases-add.html'));
}

async function addLinkModal() {
 await getModal('New link', await getFileContent('html/temp-links-add.html'));
}

async function addServerModal() {
 await getModal('New server', await getFileContent('html/temp-servers-add.html'));
}

async function addCampaign() {
 const values = {
  name: document.querySelector('.modal .body #form-name').value,
  id_server: document.querySelector('.modal .body #form-server').value,
  visible_name: document.querySelector('.modal .body #form-visible').value,
  subject: document.querySelector('.modal .body #form-subject').value,
  body: document.querySelector('.modal .body #form-body').value
 }
 document.querySelector('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/add_campaign', values);
 console.log(res);
}

async function sendCampaignModal(id, name) {
 await getModal('Send campaign', await getFileContent('html/temp-campaigns-send.html'));
 const body = document.querySelector('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
 const databases = await getAPI('/api/admin/get_databases');
 for (let i = 0; i < databases.length; i++) {
  const opt = document.createElement('option');
  opt.value = databases[i].database;
  opt.innerHTML = databases[i].database + ' (' + databases[i].count + ')';
  document.querySelector('.modal .body #form-database').appendChild(opt);
 }
}

async function sendCampaign(id) {
 const db_name = document.querySelector('.modal .body #form-database').value;
 document.querySelector('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/send_campaign', {
  id: id,
  id_database: db_name
 });
 console.log(res);
}

async function copyCampaignModal(id, name) {
 await getModal('Copy campaign', await getFileContent('html/temp-campaigns-copy.html'));
 const body = document.querySelector('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function copyCampaign(id) {
 document.querySelector('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/copy_campaign', { id: id });
 console.log(res);
}

async function deleteCampaignModal(id, name) {
 await getModal('Delete campaign', await getFileContent('html/temp-campaigns-delete.html'));
 const body = document.querySelector('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function deleteCampaign(id) {
 document.querySelector('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_campaign', { id: id });
 if (res.status == 1) {
  modalClose();
  getPage('campaigns');
 } else document.querySelector('.modal .body').innerHTML = res.message;
}

async function deleteDatabaseModal(name) {
 await getModal('Delete database', await getFileContent('html/temp-databases-delete.html'));
 const body = document.querySelector('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{NAME}', name);
}

async function deleteDatabase(name) {
 document.querySelector('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_database', { name: name });
 if (res.status == 1) {
  modalClose();
  getPage('databases');
 } else document.querySelector('.modal .body').innerHTML = res.message;
}

async function addServer() {
 const values = {
  hostname: document.querySelector('.modal .body #form-hostname').value,
  port: document.querySelector('.modal .body #form-port').value,
  secure: document.querySelector('.modal .body #form-secure').value,
  user: document.querySelector('.modal .body #form-user').value,
  password: document.querySelector('.modal .body #form-password').value,
  email: document.querySelector('.modal .body #form-email').value,
  link: document.querySelector('.modal .body #form-link').value
 }
 document.querySelector('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/add_server', values);
 if (res.status == 1) {
  modalClose();
  getPage('servers');
 } else document.querySelector('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function deleteServerModal(id, name) {
 await getModal('Delete server', await getFileContent('html/temp-servers-delete.html'));
 const body = document.querySelector('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function deleteServer(id) {
 document.querySelector('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_server', { id: id });
 if (res.status == 1) {
  modalClose();
  getPage('servers');
 } else document.querySelector('.modal .body').innerHTML = res.message;
}

async function getFileContent(file) {
 const content = await fetch(file, { headers: { 'cache-control': 'no-cache' }});
 return content.text();
}

async function getAPI(url, body = null) {
 const post = body != null ? {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
 } : {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
 };
 const res = await fetch(url, post);
 if (res.ok) return await res.json();
 else return false;
}

async function getModal(title, body) {
 const modal_html = await getFileContent('html/temp-modal.html');
 const modal = document.createElement('div');
 modal.innerHTML = modal_html.replace('{TITLE}', title).replace('{BODY}', body);
 document.body.appendChild(modal);
}

function modalClose() {
 document.querySelector('.modal').remove();
}

function getLoader() {
 return '<div class="loader"></div>';
}

function translate(template, dictionary) {
 for (const key in dictionary) template = template.replaceAll(key, dictionary[key]);
 return template;
}
