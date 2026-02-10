# Knowledge Explorer - Mindmap Setup Guide

## 1. Spreadsheet Setup
Create a spreadsheet with headers: `ID`, `ParentID`, `Label`, `URL`, `Description`, `ImageURL`.

## 2. Web Apps Script
1. Go to **Extensions** > **Apps Script**.
2. Paste `scripts/web_apps_script.js`.
3. Set your `SPREADSHEET_ID` in **Project Settings** > **Script Properties**.
4. **Deploy** as a **Web App** (Set access to "Anyone").

## 3. To get the data from the spreadsheet
1. Run the data sync script:
   ```bash
   python scripts/sync_data.py --url YOUR_WEB_APP_SCRIPT_URL_HERE
   ```
   // OR //
   ```bash
   py scripts/sync_data.py --url YOUR_WEB_APP_SCRIPT_URL_HERE
   ```
2. This generates a file called `web_site_ready.html`.
3. Open `web_site_ready.html` in Notepad or VS Code.
4. **Copy all the text** inside that file.
5. In **Your Site**: Click upload the HTML file or **Insert** > **Embed** > **Embed Code**.
6. **Paste** the text and click **Insert**.

## 4. Local Development
For local testing with Vite:
```bash
npm install
npm run dev
```