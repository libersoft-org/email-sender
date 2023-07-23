# TODO:

## Database
- add a footer column to server table (for unsubscribe link)

## Mail Sender script
- disable INFO log level on dbConnect and dbDisconnect
- automated link rewriter with stats in web UI

## Web Server script
- campaign management UI:
  - campaigns (edit, duplicate)
  - databases (import)
  - servers (edit, duplicate)
  - links + visits + other stats data (view, add, edit, delete)
  - send queue (view, delete - based on campaign or everything)
  - modal window:
    - add drag and drop move
    - add resize
    - fix scrollbar in modal body
    - fix max-width
  - admin API - add login / logout + token
  - add mobile responsive design
  - campaigns, databases, servers, short links, queue - add paging to API and frontend
  - modal - close on escape, confirm on enter, autofocus the first input

## DB import
- remove this script after it's in campaign management UI
- move data from "import-db_example.txt" to input box in campaign management UI

## Other
- add some more screenshots to README.md
- implement list unsubscribe and feedback loop (add to headers and create a script that checks the mailbox for FBL / LU reports)
