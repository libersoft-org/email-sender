# TODO:

## Mail Sender script
- disable INFO log level on dbConnect and dbDisconnect
- automated link rewriter with stats in web UI
- replace {UNSUBSCRIBE} in mail body in queue to what is in servers.footer column based on which server is used by campaign

## Web Server script
- campaign management UI:
  - send queue (view, delete - based on campaign or everything)
  - links:
    - add more stats data to visits table (browser, resolution etc.) + add summary button for each link
    - add redirect link above stats data table
  - admin API - add login / logout + token
  - modal - close on escape, confirm on enter, autofocus the first input
  - modal window:
    - add drag and drop move
    - add resize
    - fix scrollbar in modal body
    - fix max-width
  - add mobile responsive design
  - when scrolled down and then clicked on something that shows modal, then modal appears at the top of the page
  - campaigns, databases, servers, short links, queue - add paging to API and frontend

## Other
- add some more screenshots to README.md
- add undeliverable script connected to mailbox
- implement list unsubscribe and feedback loop (add to headers and create a script that checks the mailbox for FBL / LU reports)
