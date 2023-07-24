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
 if (qsa('#menu .items a .item.active').length == 1) qsa('#menu .items a .item.active')[0].classList.remove('active');
 const pages = JSON.parse(await getFileContent('pages.json'));
 if (page in pages) {
  document.title = pageName + ' - ' + pages[page].label;
  if (qs('#menu .items a .item.menu-' + page)) qs('#menu .items a .item.menu-' + page).classList.add('active');
  content = await getFileContent('html/' + page + '.html');
 } else {
  document.title = pageName + ' - ' + pages['notfound'].label;
  content = await getFileContent('html/notfound.html');
 }
 qs('#content').innerHTML = content;
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
 qs('#menu .items').innerHTML = menu_html + "\n" + '<a onclick="logout()"><div class="item menu-logout">Logout</div></a>';
}

async function getPageData(template, api, trans) {
 const temp = await getFileContent(template);
 let html = '';
 for (let i = 0; i < api.data.length; i++) html += translate(temp, trans(api.data[i]));
 qs('#content tbody').innerHTML = html;
 qs('.loader').remove();
}

async function getCampaigns() {
 await getPageData('html/temp-campaigns-row.html', await getAPI('/api/admin/get_campaigns'), (item) => ({
  '{ID}': item.id,
  '{NAME}': item.name,
  '{SERVER}': item.server + ' (' + item.id_server + ')',
  '{CREATED}': new Date(item.created).toLocaleString()
 }));
}

async function addCampaignModal() {
 await getModal('New campaign', await getFileContent('html/temp-campaigns-add.html'));
 const servers = await getAPI('/api/admin/get_servers');
 for (let i = 0; i < servers.data.length; i++) {
  const opt = document.createElement('option');
  opt.value = servers.data[i].id;
  opt.innerHTML = servers.data[i].server;
  qs('.modal .body #form-server').appendChild(opt);
 }
}

async function addCampaign() {
 const values = {
  name: qs('.modal .body #form-name').value,
  id_server: qs('.modal .body #form-server').value,
  visible_name: qs('.modal .body #form-visible').value,
  subject: qs('.modal .body #form-subject').value,
  body: qs('.modal .body #form-body').value
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/add_campaign', values);
 if (res.status == 1) {
  closeModal();
  getPage('campaigns');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function sendCampaignModal(id, name) {
 await getModal('Send campaign', await getFileContent('html/temp-campaigns-send.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
 const databases = await getAPI('/api/admin/get_databases');
 for (let i = 0; i < databases.data.length; i++) {
  const opt = document.createElement('option');
  opt.value = databases.data[i].database;
  opt.innerHTML = databases.data[i].database + ' (' + databases.data[i].count + ')';
  qs('.modal .body #form-database').appendChild(opt);
 }
}

async function sendCampaign(id) {
 const db_name = qs('.modal .body #form-database').value;
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/send_campaign', { id: id, database: db_name });
 if (res.status == 1) {
  closeModal();
  getPage('campaigns');
 } else qs('.modal .body .error').innerHTML = res.message;
}

async function copyCampaignModal(id, name) {
 await getModal('Copy campaign', await getFileContent('html/temp-campaigns-copy.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function copyCampaign(id) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/copy_campaign', { id: id });
 if (res.status == 1) {
  closeModal();
  getPage('campaigns');
 } else qs('.modal .body').innerHTML = res.message;
}

async function deleteCampaignModal(id, name) {
 await getModal('Delete campaign', await getFileContent('html/temp-campaigns-delete.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function deleteCampaign(id) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_campaign', { id: id });
 if (res.status == 1) {
  closeModal();
  getPage('campaigns');
 } else qs('.modal .body').innerHTML = res.message;
}

async function getDatabases() {
 await getPageData('html/temp-databases-row.html', await getAPI('/api/admin/get_databases'), (item) => ({
  '{NAME}': item.database,
  '{CONTACTS}': item.count,
 }));
}

async function addDatabaseModal() {
 await getModal('New database', await getFileContent('html/temp-databases-add.html'));
}

async function addDatabase() {
 const values = { name: qs('.modal .body #form-name').value }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/add_database', values);
 if (res.status == 1) {
  closeModal();
  getPage('databases');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function editDatabaseModal(name) {
 await getModal('Edit database', await getFileContent('html/temp-databases-edit.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{NAME}', name);
}

async function editDatabase() {
 const values = {
  name: qs('.modal .body #form-name').value,
  name_old: qs('.modal .body #form-name-old').value
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/edit_database', values);
 if (res.status == 1) {
  closeModal();
  getPage('databases');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function deleteDatabaseModal(name) {
 await getModal('Delete database', await getFileContent('html/temp-databases-delete.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{NAME}', name);
}

async function deleteDatabase(name) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_database', { name: name });
 if (res.status == 1) {
  closeModal();
  getPage('databases');
 } else qs('.modal .body').innerHTML = res.message;
}

async function getLinks() {
 await getPageData('html/temp-links-row.html', await getAPI('/api/admin/get_links'), (item) => ({
  '{ID}': item.id,
  '{NAME}': item.name,
  '{LINK}': (item.link.length >= 30 ? item.link.slice(0, 30) + '...' : item.link),
  '{VISITS}': item.visits + ' / ' + item.visits_unique,
  '{CREATED}': new Date(item.created).toLocaleString()
 }));
}

async function addLinkModal() {
 await getModal('New link', await getFileContent('html/temp-links-add.html'));
}

async function addLink() {
 const values = {
  name: qs('.modal .body #form-name').value,
  link: qs('.modal .body #form-link').value
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/add_link', values);
 if (res.status == 1) {
  closeModal();
  getPage('links');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function deleteLinkModal(id, name) {
 await getModal('Delete link', await getFileContent('html/temp-links-delete.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function deleteLink(id) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_link', { id: id });
 if (res.status == 1) {
  closeModal();
  getPage('links');
 } else qs('.modal .body').innerHTML = res.message;
}

async function getServers() {
 await getPageData('html/temp-servers-row.html', await getAPI('/api/admin/get_servers'), (item) => ({
  '{ID}': item.id,
  '{NAME}': item.server,
  '{EMAIL}': item.email,
  '{CREATED}': new Date(item.created).toLocaleString()
 }));
}

async function addServerModal() {
 await getModal('New server', await getFileContent('html/temp-servers-add.html'));
}

async function addServer() {
 const values = {
  hostname: qs('.modal .body #form-hostname').value,
  port: qs('.modal .body #form-port').value,
  secure: qs('.modal .body #form-secure').checked,
  user: qs('.modal .body #form-user').value,
  password: qs('.modal .body #form-password').value,
  email: qs('.modal .body #form-email').value,
  link: qs('.modal .body #form-link').value,
  footer: qs('.modal .body #form-footer').value
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/add_server', values);
 if (res.status == 1) {
  closeModal();
  getPage('servers');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function copyServerModal(id, name) {
 await getModal('Copy server', await getFileContent('html/temp-servers-copy.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function copyServer(id) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/copy_server', { id: id });
 if (res.status == 1) {
  closeModal();
  getPage('servers');
 } else qs('.modal .body').innerHTML = res.message;
}

async function editServerModal(id) {
 // TODO get info from api
 const temp = await getFileContent('html/temp-servers-edit.html')
 const res = await getAPI('/api/admin/get_server', { id: id });
 if (res.status == 1) {
  const server_html = translate(temp, {
  '{ID}': id,
  '{HOSTNAME}': res.data[0].server,
  '{PORT}': res.data[0].port,
  '{SECURE}': res.data[0].secure == 1 ? 'checked' : '',
  '{USER}': res.data[0].auth_user ? res.data[0].auth_user : '',
  '{PASSWORD}': res.data[0].auth_pass ? res.data[0].auth_pass : '',
  '{EMAIL}': res.data[0].email,
  '{LINK}': res.data[0].link,
  '{FOOTER}': res.data[0].footer,
  });
  await getModal('Edit server', server_html);
 } else await getModal('Edit server', '<div class="error">' + res.message + '</div>');
}

async function editServer() {
 const values = {
  id: qs('.modal .body #form-id').value,
  hostname: qs('.modal .body #form-hostname').value,
  port: qs('.modal .body #form-port').value,
  secure: qs('.modal .body #form-secure').checked,
  user: qs('.modal .body #form-user').value,
  password: qs('.modal .body #form-password').value,
  email: qs('.modal .body #form-email').value,
  link: qs('.modal .body #form-link').value,
  footer: qs('.modal .body #form-footer').value
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/edit_server', values);
 if (res.status == 1) {
  closeModal();
  getPage('servers');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function deleteServerModal(id, name) {
 await getModal('Delete server', await getFileContent('html/temp-servers-delete.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function deleteServer(id) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_server', { id: id });
 if (res.status == 1) {
  closeModal();
  getPage('servers');
 } else qs('.modal .body').innerHTML = res.message;
}

async function getQueue() {
 await getPageData('html/temp-queue-row.html', await getAPI('/api/admin/get_queue'), (item) => ({
  '{ID}': item.id,
  '{CAMPAIGN}': item.campaign,
  '{STATE}': item.state
 }));
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
 qs('body').appendChild(modal);
}

function closeModal() {
 qs('.modal').remove();
}

function getLoader() {
 return '<div class="loader"></div>';
}

function translate(template, dictionary) {
 for (const key in dictionary) template = template.replaceAll(key, dictionary[key]);
 return template;
}

function qs(query) {
 return document.querySelector(query);
}

function qsa(query) {
 return document.querySelectorAll(query);
}
