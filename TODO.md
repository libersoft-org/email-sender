# TODO:

## Mail Sender script
HOTOVO - disable INFO log level on dbConnect and dbDisconnect
- automated link rewriter with stats in web UI - NA TOHLE UZ JSOU NASTROJE, ROZJEL JSEM EXAMPLE NA http://www8.yourls.wsad.cz/admin/ (username, password)
- replace {UNSUBSCRIBE} in mail body in queue to what is in servers.footer column based on which server is used by campaign

## Web Server script
- campaign management UI:
  - HOTOVO - send queue (delete)
  - links (viz. nahore http://www8.yourls.wsad.cz/admin/):
    - add more stats data to visits table (browser, resolution etc.) + add summary button for each link
    - add redirect link above stats data table
  HOTOVO - admin API - add login / logout + token
  - HOTOVO -modal - close on escape, confirm on enter, autofocus the first input
  - modal window:
    - TOHLE JE PODLE ME ZBYTECNY - add drag and drop move
    HOTOVO - add resize
    HOTOVO - fix scrollbar in modal body
    HOTOVO - fix max-width
  - add mobile responsive design
  - HOTOVO - when scrolled down and then clicked on something that shows modal, then modal appears at the top of the page
  - campaigns, databases, servers, short links, queue - add paging to API and frontend

## Other
- add some more screenshots to README.md
- add undeliverable script connected to mailbox
- implement list unsubscribe and feedback loop (add to headers and create a script that checks the mailbox for FBL / LU reports)
