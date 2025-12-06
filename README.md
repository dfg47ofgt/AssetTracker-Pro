<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1p_fcn9gJiunyid_blplhuqQ6khXn94Pc

## Run Locally

**Prerequisites:**  Node.js 18+

1. Install dependencies: `npm install`
2. Create or edit `.env` and set `GEMINI_API_KEY`
3. Start the dev server: `npm run dev`

## Data Persistence

- Runtime state (users, deposits, balances, history) is stored in `data/appData.json` through the built-in Vite middleware.
- The app will bootstrap the file automatically if it is missing; ensure the `data` directory is writable before starting the server.
- Changes made through the UI are written to disk instantly. Commit or back up `data/appData.json` if you want to preserve the dataset.
