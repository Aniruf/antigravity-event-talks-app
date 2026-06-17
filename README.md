# BigQuery Release Notes Tracker

A modern, high-fidelity web application built with Python Flask, HTML5, JavaScript, and CSS. The app automatically fetches, parses, segments, and displays the official Google Cloud BigQuery Release Notes from its XML feed, and enables users to format and tweet specific updates instantly.

## 🚀 Key Features

*   **Automated XML Parsing:** Periodically queries Google Cloud's Atom RSS feed, extracting titles, dates, and bodies automatically.
*   **Intelligent Section Segmentation:** Splits clustered daily logs by sub-headers (`<h3>` tags) to render distinct, individual update entries.
*   **Interactive X (Twitter) Integration:** Features a built-in tweet composer modal that strips HTML tags, formats details, appends configurable hashtags, enforces the 280-character limit, and provides a real-time card preview.
*   **Interactive Search & Badging:** Supports real-time text query searching and categorization filters (e.g. *Features*, *Announcements*, *Deprecated*, *Breaking Changes*) with interactive counts.
*   **Aesthetic Dark UI:** Implements a slate dark-mode design system using fluid transitions, skeleton loaders (shimmering UI placeholders), active status beacons, and mobile responsiveness.
*   **In-Memory Resilient Cache:** Falls back automatically to cached JSON copies if Google's servers are rate-limited or offline.
*   **In-Memory Resilient Cache:** Falls back automatically to cached JSON copies if Google's servers are rate-limited or offline.
*   **Floating Toast Notifications:** Unobtrusive success, warning, and error messages for actions like copy and export.
*   **Copy to Clipboard:** One‑click copy of release updates with visual feedback.
*   **Export to CSV:** Export filtered release notes to a CSV file with proper handling.
---

## 🛠️ Tech Stack

*   **Backend:** Python 3.x, Flask
*   **Frontend:** Vanilla JavaScript, HTML5, CSS3, Google Fonts (Outfit, Inter), FontAwesome Icons
*   **Libraries Utilized (Python):** `urllib.request` (standard library HTTP), `xml.etree.ElementTree` (standard library XML compiler), `re` (Regex pattern recognition)

---

## 📂 Project Structure

```text
bq-release-notes/
├── app.py                     # Flask backend, XML parser, endpoint router
├── .gitignore                 # Excludes caches, virtual environments, and configuration files
├── README.md                  # Project documentation & configuration guide
├── templates/
│   └── index.html             # Dashboard UI structure & Twitter modal layout
└── static/
    ├── css/
    │   └── style.css          # Variable-driven CSS styling, loaders, & modals
    └── js/
        └── main.js            # DOM bindings, API requests, search/filter logic, & modal preview
```

---

## ⚙️ Installation & Local Setup

Follow these steps to run the application locally on your computer.

### 1. Prerequisites
Ensure you have Python 3.x and `pip` installed:
```bash
python --version
```

### 2. Install Dependencies
Install the required dependencies (Flask and requests):
```bash
pip install flask
```

### 3. Run the Flask Server
From the workspace root directory, start the server:
```bash
python bq-release-notes/app.py
```

The server will initialize locally:
```text
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### 4. Open the App
Open your web browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)** *(includes Floating Toast Notifications, Copy to Clipboard, Export to CSV)*

---

## 🔄 Request-Response Flow

Below is the execution flow when the dashboard is loaded or refreshed:

1.  **Request:** The browser initiates a request to the backend: `GET /api/releases`. The front-end transitions into a loading state (spinner rotates, skeleton shimmers display).
2.  **Fetch & Process:**
    *   Flask requests the feed from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
    *   The backend parses the namespace structure and splits entries by `<h3>` update categories using `parse_updates()`.
    *   The structured logs are cached.
3.  **Response:** The server returns a standardized JSON payload.
4.  **Render:** The browser consumes the JSON:
    *   `calculateStatistics()` updates counts for features and alerts.
    *   `renderTimeline()` injects the cards and categorizes badges in the DOM, clearing the loading skeleton.
