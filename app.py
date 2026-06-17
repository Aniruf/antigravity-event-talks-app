import urllib.request
import xml.etree.ElementTree as ET
import re
import logging
from flask import Flask, jsonify, render_template
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# In-memory cache for fallback when offline or during rate-limits
cache = {
    "data": [],
    "last_fetched": None
}

def parse_updates(content_html):
    """
    Parses Google Cloud Release Notes HTML content.
    Splits the content by <h3> headers (e.g. <h3>Feature</h3>, <h3>Announcement</h3>)
    and returns a list of update objects containing the type and description.
    """
    if not content_html:
        return []
    
    # Split by H3 headers (which specify the update categories like Feature, Fix, Deprecated, etc.)
    pattern = re.compile(r'<h3>(.*?)</h3>', re.DOTALL)
    matches = list(pattern.finditer(content_html))
    
    updates = []
    if not matches:
        # If no h3 headers are found, treat the entire string as a 'General' update
        updates.append({
            'type': 'General',
            'body': content_html.strip()
        })
        return updates
        
    for i in range(len(matches)):
        start = matches[i].end()
        end = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
        
        type_str = matches[i].group(1).strip()
        body_html = content_html[start:end].strip()
        
        updates.append({
            'type': type_str,
            'body': body_html
        })
    return updates

@app.route('/')
def index():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """
    Fetches the BigQuery XML feed, parses it, and returns a JSON list of entries.
    Falls back to cached data if the feed is unavailable.
    """
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        # Build requests with User-Agent to avoid getting blocked
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read()
        
        root = ET.fromstring(content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_elem = entry.find('atom:title', ns)
            id_elem = entry.find('atom:id', ns)
            updated_elem = entry.find('atom:updated', ns)
            content_elem = entry.find('atom:content', ns)
            link_elem = entry.find('atom:link', ns)
            
            date_str = title_elem.text if title_elem is not None else ""
            entry_id = id_elem.text if id_elem is not None else ""
            updated_str = updated_elem.text if updated_elem is not None else ""
            content_html = content_elem.text if content_elem is not None else ""
            
            link_url = ""
            if link_elem is not None:
                link_url = link_elem.attrib.get('href', '')
                
            updates = parse_updates(content_html)
            
            entries.append({
                'id': entry_id,
                'date': date_str,
                'updated': updated_str,
                'link': link_url,
                'updates': updates
            })
            
        cache["data"] = entries
        cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        return jsonify({
            "success": True,
            "source": "fresh",
            "last_fetched": cache["last_fetched"],
            "releases": entries
        })
        
    except Exception as e:
        logger.error(f"Error fetching release notes: {e}", exc_info=True)
        # Check if we have cached data to fall back on
        if cache["data"]:
            return jsonify({
                "success": True,
                "source": "cache",
                "last_fetched": cache["last_fetched"],
                "releases": cache["data"],
                "warning": f"Could not fetch fresh data: {str(e)}"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to fetch or parse release notes: {str(e)}"
            }), 500

if __name__ == '__main__':
    # Running locally on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
