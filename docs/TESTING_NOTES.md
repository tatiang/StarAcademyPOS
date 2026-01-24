# Testing Notes

## v1.94 Testing
- Verified IT Hub loads correctly.
- Confirmed 'docs/' files load into the modal.
- Checked Firestore sync resilience.

## Known Issues
- If running via "file://" protocol, documentation fetching might be blocked by browser security (CORS). Use "Live Server" or a local host.-

### v.157
—————————
Renamed firebase-init to firestore_v1.57.js (as requested).
Fixed Buttons: Added explicit code to attach functions to window so the HTML buttons (onclick="...") can "see" them.
Fixed Cloud: Verified the initialization code in the Firestore file.

### v1.53 
—————————
Updated employee roles
Added recurring backup to Firestore (timestamped)
   • Attempting to prevent data overwriting such as when employees disappeared
Introduced customer ordering screen

### v1.35 (another "definitive" version)
—————————
IT Hub screen content should adjust to window width
If you click Download for an AI-generated image, it opens the image in the same tab. It should download or open in a new tab. 

### v1.34
—————————
New baseline; similar to v1.29

### v1.29 (now the "definitive" version for Gemini)
—————————
Login screen looks correct
  • No more connecting to database delays
POS screen
  • It should sync image urls from Firestore. Right now, it seems like it's not saving them in the app but I do see them in Firestore. It just doesn't retrieve them.

Didn't save any of the previous AI-generated item images I had saved in an earlier version
  • Do these get stored in Firestore Database? 
    • Seems to work okay now...?
When adding or changing an item image, especially when generating AI image, it should show a status such as a green/yellow light or "generating..." so you know it's working on it
  • Add a download button or an upload to GitHub button so I can save generated images
  • If not GitHub then maybe Cloudinary?
Inventory screen
  • Add small thumbnail image for each item
  • Items should be sortable by each header
  • Categories should have emojis or symbols
Manager Hub screen
  • Add ability to report bug or feature suggestion
  • Add ability to add/edit/delete employees
  • Other recommended functionality for this screen
Can error messages (such as clocking in/out without selecting a student's name) have a different dialog title than "tatiang.github.io says"?
  • This appears to be fixed in v1.34
All times should be in HH:MM format
  • This appears to be fixed in v1.34
IT Hub screen
  • Embed TESTING_NOTES from Github's /TESTING_NOTES file
    • This appears to be included in v1.34
  • Expandable list of current features, known bugs, potential future improvements
    • This appears to be included in v1.34


