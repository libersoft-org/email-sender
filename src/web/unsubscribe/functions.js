window.onload = function() {
 const urlParams = new URLSearchParams(window.location.search);
 const emailElem = document.querySelector('#email');
 emailElem.value = urlParams.get('email');
 emailElem.focus();
};

async function unsubscribe() {
 const emailElem = document.querySelector('#email');
 const res = await fetch('/api/unsubscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: emailElem.value })
 });
 if (res.ok) {
  const data = await res.json();
  setLabel(data.type, data.message);
 } else setLabel(2, 'Error: Cannot connect with server.');
 emailElem.focus();
}

function enterPressed() {
 if (event.key === 'Enter') unsubscribe();
}

function setLabel(type, message) {
 const msg = document.querySelector('#message')
 if (type == 0) msg.className =  'green';
 if (type == 1) msg.className =  'orange';
 if (type == 2) msg.className =  'red';
 msg.innerHTML = message;
}
