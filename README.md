Contractor Dashboard (Standalone static package)
-----------------------------------------------

How to use:
1. Replace API_BASE in app.js with your Render API base (example: https://service-point-sa-1.onrender.com).
2. Zip the folder and send to contractors. They open index.html in a browser.
3. Contractors login via the Render API endpoint: POST /api/contractor/login with {phone,password}.
4. The dashboard uses existing Render API endpoints:
   - /api/contractor (GET/POST)
   - /api/leads (GET)
   - /api/reviews (GET)
   - /api/message (POST)

Do NOT store any service keys in these static files.
