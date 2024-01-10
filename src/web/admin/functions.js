const pageName = 'E-mail Sender';
let pages;

window.onload = async () => {
 let pg = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
 if(location.pathname.lastIndexOf('admin') == -1)
  return;
 await getMenu();
 getReload(pg);
 window.addEventListener('popstate', async function(e) { getReload(pg); });
 document.addEventListener("keyup", function(e){
  if(e.key == "Escape")
    closeModal();
  else if(e.key == "Enter" && e.target.tagName.toLowerCase() != 'textarea')
    qs("#form-confirm").click();
 });
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
 const temp = await getFileContent('html/menu.html');
 const pages = JSON.parse(await getFileContent('pages.json'));
 let html = '';
 for (const page in pages) {
  if (pages[page].menu) {
   const button_html = translate(temp, {
    '{CLASS}': page,
    '{NAME}': page == 'about' ? '' : page,
    '{LABEL}': pages[page].label
   });
   html += button_html + "\n";
  }
 }
 qs('#menu .items').innerHTML = html + "\n" + '<a onclick="logout()"><div class="item menu-logout">Logout</div></a>';
}

async function getPageData(template, api, trans) {
 const temp = await getFileContent(template);
 let html = '';
 for (let i = 0; i < api.data.length; i++) html += translate(temp, trans(api.data[i]));
 qs('#content tbody').innerHTML = html;
 qs('.loader').remove();
}

async function getCampaigns() {
 await getPageData('html/campaigns-row.html', await getAPI('/api/admin/get_campaigns'), (item) => ({
  '{ID}': item.id,
  '{NAME}': item.name,
  '{SERVER}': item.server + ' (' + item.id_server + ')',
  '{CREATED}': new Date(item.created).toLocaleString()
 }));
}

async function addCampaignModal() {
 await getModal('New campaign', await getFileContent('html/campaigns-add.html'));
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
 await getModal('Send campaign', await getFileContent('html/campaigns-send.html'));
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
 await getModal('Copy campaign', await getFileContent('html/campaigns-copy.html'));
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

async function editCampaignModal(id) {
 const temp = await getFileContent('html/campaigns-edit.html')
 const res = await getAPI('/api/admin/get_campaign', { id: id });
 if (res.status == 1) {
  const html = translate(temp, {
  '{ID}': id,
  '{NAME}': res.data[0].name,
  '{VISIBLE_NAME}': res.data[0].visible_name,
  '{SUBJECT}': res.data[0].subject,
  '{BODY}': res.data[0].body
  });
  await getModal('Edit campaign', html);
  const servers = await getAPI('/api/admin/get_servers');
  for (let i = 0; i < servers.data.length; i++) {
   const opt = document.createElement('option');
   opt.value = servers.data[i].id;
   if (opt.value == res.data[0].id_server) opt.selected = true;
   opt.innerHTML = servers.data[i].server;
   qs('.modal .body #form-server').appendChild(opt);
  }
 } else await getModal('Edit campaign', '<div class="error">' + res.message + '</div>');
}

async function editCampaign() {
 const values = {
  id: qs('.modal .body #form-id').value,
  name: qs('.modal .body #form-name').value,
  id_server: qs('.modal .body #form-server').value,
  visible_name: qs('.modal .body #form-visible').value,
  subject: qs('.modal .body #form-subject').value,
  body: qs('.modal .body #form-body').value
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/edit_campaign', values);
 if (res.status == 1) {
  closeModal();
  getPage('campaigns');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function login(username, password) {
    const res = await getAPI('/api/login', {username: username, password: password});
    if(res && res.status == 1 && res.message){
      localStorage.setItem("auth", res.message);
      location.href = "./admin/";
    }
}

async function logout() {
  localStorage.removeItem("auth");
  location.href = "../";
}

async function deleteCampaignModal(id, name) {
 await getModal('Delete campaign', await getFileContent('html/campaigns-delete.html'));
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
 await getPageData('html/databases-row.html', await getAPI('/api/admin/get_databases'), (item) => ({
  '{NAME}': item.database,
  '{CONTACTS}': item.count,
 }));
}

async function addDatabaseModal() {
 await getModal('New database', await getFileContent('html/databases-add.html'));
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

async function importDatabaseModal(name) {
 await getModal('Import contacts to database', await getFileContent('html/databases-import.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{NAME}', name);
}

async function importDatabase() {
 const file = qs('.modal .body #form-file').files[0];
 if (file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
   qs('.modal .body #form-file-content').value = e.target.result;
   const values = {
    name: qs('.modal .body #form-name').value,
    content: qs('.modal .body #form-file-content').value
   }
   qs('.modal .body .error').innerHTML = getLoader();
   const res = await getAPI('/api/admin/import_database', values);
   if (res.status == 1) {
    closeModal();
    getPage('databases');
   } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
  };
  reader.readAsText(file);
 } else {
  qs('.modal .body .error').innerHTML = 'Error: File not selected';
 }
}

async function editDatabaseModal(name) {
 await getModal('Edit database', await getFileContent('html/databases-edit.html'));
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
 await getModal('Delete database', await getFileContent('html/databases-delete.html'));
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
 await getPageData('html/links-row.html', await getAPI('/api/admin/get_links'), (item) => ({
  '{ID}': item.id,
  '{NAME}': item.name,
  '{LINK}': item.link,
  '{LINK_LABEL}': (item.link.length >= 30 ? item.link.slice(0, 30) + '...' : item.link),
  '{VISITS}': item.visits + ' / ' + item.visits_unique,
  '{CREATED}': new Date(item.created).toLocaleString()
 }));
}

async function addLinkModal() {
 await getModal('New link', await getFileContent('html/links-add.html'));
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

async function editLinkModal(id) {
 const temp = await getFileContent('html/links-edit.html')
 const res = await getAPI('/api/admin/get_link', { id: id });
 if (res.status == 1) {
  const html = translate(temp, {
   '{ID}': id,
   '{NAME}': res.data[0].name,
   '{LINK}': res.data[0].link,
  });
  await getModal('Edit link', html);
 } else await getModal('Edit link', '<div class="error">' + res.message + '</div>');
}

async function editLink() {
 const values = {
  id: qs('.modal .body #form-id').value,
  name: qs('.modal .body #form-name').value,
  link: qs('.modal .body #form-link').value,
 }
 qs('.modal .body .error').innerHTML = getLoader();
 const res = await getAPI('/api/admin/edit_link', values);
 if (res.status == 1) {
  closeModal();
  getPage('links');
 } else qs('.modal .body .error').innerHTML = 'Error: ' + res.message;
}

async function deleteLinkModal(id, name) {
 await getModal('Delete link', await getFileContent('html/links-delete.html'));
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
 await getPageData('html/servers-row.html', await getAPI('/api/admin/get_servers'), (item) => ({
  '{ID}': item.id,
  '{NAME}': item.server,
  '{EMAIL}': item.email,
  '{CREATED}': new Date(item.created).toLocaleString()
 }));
}

async function addServerModal() {
 await getModal('New server', await getFileContent('html/servers-add.html'));
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
 await getModal('Copy server', await getFileContent('html/servers-copy.html'));
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
 const temp = await getFileContent('html/servers-edit.html')
 const res = await getAPI('/api/admin/get_server', { id: id });
 if (res.status == 1) {
  const html = translate(temp, {
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
  await getModal('Edit server', html);
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
 await getModal('Delete server', await getFileContent('html/servers-delete.html'));
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
 const queue = await getAPI('/api/admin/get_queue');
 let statuses = [ 'Unsent', 'Sent', 'Error' ];
 for (let i = 0; i < queue.data.length; i++) {
  const counts = await(getAPI('/api/admin/get_queue_counts', { id: queue.data[i].id_campaign }));
  queue.data[i].counts_html = '';
  for (let j = 0; j < counts.data.length; j++) {
   queue.data[i].counts_html += '<a onclick="deleteQueueCampaignModal(' + queue.data[i].id_campaign + ', ' + queue.data[i].name + ', ' + counts.data[j].state + ', ' + statuses[counts.data[j].state] + ')"><img src="./img/delete.svg" alt="Delete"></img></a> ' + statuses[counts.data[j].state] + ' - <span class="bold">' + counts.data[j].cnt + '</span><br />';
  }
 }
 await getPageData('html/queue-row.html', queue, (item) => ({
  '{CAMPAIGN_ID}': item.id_campaign,
  '{CAMPAIGN_NAME}': item.name,
  '{STATUS}': item.counts_html
 }));
}

async function deleteQueueModal() {
 await getModal('Delete all from queue', await getFileContent('html/queue-delete.html'));
}

async function deleteQueue() {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_queue');
 if (res.status == 1) {
  closeModal();
  getPage('queue');
 } else qs('.modal .body').innerHTML = res.message;
}

async function deleteQueueCampaignModal(id, name) {
 await getModal('Delete campaign messages from queue', await getFileContent('html/queue-delete-campaign.html'));
 const body = qs('.modal .body');
 body.innerHTML = body.innerHTML.replaceAll('{ID}', id).replaceAll('{NAME}', name);
}

async function deleteQueueCampaign(id, status = null) {
 qs('.modal .body').innerHTML = getLoader();
 const res = await getAPI('/api/admin/delete_queue_campaign', status == null ? { id: id } : { id: id, status: status } );
 if (res.status == 1) {
  closeModal();
  getPage('queue');
 } else qs('.modal .body').innerHTML = res.message;
}

async function getFileContent(file) {
 const content = await fetch(file, { headers: { 'cache-control': 'no-cache' }});
 return content.text();
}

async function getAPI(url, body = null) {
 var jwt = localStorage.getItem("auth");
 const post = body != null ? {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'auth': jwt },
  body: JSON.stringify(body)
 } : {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'auth': jwt  }
 };
 const res = await fetch(url, post);
 if (res.ok){
   const ret =  await res.json();
   if(ret.status && ret.status == 401)
    {
        location.href = "/";
        return false;
    }
   return ret;
 }
 else return false;
}

async function getModal(title, body) {
 const html = await getFileContent('html/modal.html');
 const modal = document.createElement('div');
 modal.innerHTML = html.replace('{TITLE}', title).replace('{BODY}', body);
 qs('body').appendChild(modal);
 setTimeout(function(){
  var focusEl = qs('.modal input[type=text], .modal input[type=number], .modal input[type=password], .modal textarea');
  if(focusEl)
    focusEl.focus();
 }, 10);
}

function closeModal() {
 qs('.modal-data').remove();
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
