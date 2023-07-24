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
  setLabel(data.status, data.message);
 } else setLabel(2, 'Error: Cannot connect with server.');
 emailElem.focus();
}

function enterPressed() {
 if (event.key === 'Enter') unsubscribe();
}

function setLabel(status, message) {
 const msg = document.querySelector('#message')
 if (status == 1) msg.className = 'green';
 if (status == 2) msg.className = 'orange';
 if (status == 3) msg.className = 'red';
 msg.innerHTML = message;
}
