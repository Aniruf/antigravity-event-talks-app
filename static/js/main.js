// State Management
let releaseNotes = []; // Raw feed data from Flask API
let activeFilter = 'all'; // Current type filter
let searchQuery = ''; // Current search text
let selectedUpdateForTweet = null; // Stored update context for Twitter modal

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const refreshIcon = document.getElementById('refresh-icon');
const lastUpdatedText = document.getElementById('last-updated-text');
const releasesTimeline = document.getElementById('releases-timeline');
const emptyState = document.getElementById('empty-state');
const skeletonLoader = document.getElementById('skeleton-loader');
const warningBanner = document.getElementById('warning-banner');
const warningMessage = document.getElementById('warning-message');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const filterBadges = document.querySelectorAll('.filter-badge');
const statCards = document.querySelectorAll('.stat-card');
const btnResetFilters = document.getElementById('btn-reset-filters');

// Stats Counters Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statBreaking = document.getElementById('stat-breaking');

// Modal Elements
const twitterModal = document.getElementById('twitter-modal');
const modalClose = document.getElementById('modal-close');
const btnCancelTweet = document.getElementById('btn-cancel-tweet');
const btnSubmitTweet = document.getElementById('btn-submit-tweet');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charCounter = document.getElementById('char-counter');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const hashtagTags = document.querySelectorAll('.hashtag-tag');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check and apply stored theme preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    }

    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Refresh Button
    btnRefresh.addEventListener('click', fetchReleaseNotes);

    // Export CSV Button
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportToCsv);
    }

    // Theme Toggle Button
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', toggleTheme);
    }

    // Search Input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        searchClearBtn.style.display = searchQuery ? 'block' : 'none';
        renderTimeline();
    });

    // Clear Search Input Button
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        renderTimeline();
    });

    // Filter Badges
    filterBadges.forEach(badge => {
        badge.addEventListener('click', (e) => {
            filterBadges.forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            activeFilter = badge.getAttribute('data-type');
            renderTimeline();
            
            // Sync with stats panel active states if matches
            syncStatsActiveState(activeFilter);
        });
    });

    // Stats Section Cards (Quick click to filter)
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.getAttribute('data-filter');
            let targetType = 'all';
            
            if (filterType === 'feature') targetType = 'Feature';
            else if (filterType === 'announcement') targetType = 'Announcement';
            else if (filterType === 'breaking') targetType = 'Breaking Change';
            
            // Find and click the corresponding filter badge
            const targetBadge = document.querySelector(`.filter-badge[data-type="${targetType}"]`);
            if (targetBadge) {
                targetBadge.click();
            }
        });
    });

    // Reset Filters Button (Empty state fallback)
    btnResetFilters.addEventListener('click', resetAllFilters);

    // Modal Close Triggers
    modalClose.addEventListener('click', closeTwitterModal);
    btnCancelTweet.addEventListener('click', closeTwitterModal);
    
    // Clicking outside modal content closes it
    twitterModal.addEventListener('click', (e) => {
        if (e.target === twitterModal) {
            closeTwitterModal();
        }
    });

    // Tweet Input Textarea Updates
    tweetTextarea.addEventListener('input', updateTweetStats);

    // Hashtag Toggles inside Modal
    hashtagTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const tagText = tag.getAttribute('data-tag');
            toggleHashtag(tagText, tag);
        });
    });

    // Submit Tweet Button (Opens Twitter web intent)
    btnSubmitTweet.addEventListener('click', submitTweet);
}

// Reset filter state
function resetAllFilters() {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    
    // Click 'All' Badge
    const allBadge = document.querySelector('.filter-badge[data-type="all"]');
    if (allBadge) allBadge.click();
}

// Synchronize stat cards active styles
function syncStatsActiveState(filter) {
    statCards.forEach(card => card.classList.remove('active-card'));
    
    let targetFilter = 'all';
    if (filter === 'Feature') targetFilter = 'feature';
    else if (filter === 'Announcement') targetFilter = 'announcement';
    else if (filter === 'Breaking Change' || filter === 'Deprecated') targetFilter = 'breaking';
    
    const activeCard = document.querySelector(`.stat-card[data-filter="${targetFilter}"]`);
    if (activeCard && targetFilter !== 'all') {
        activeCard.classList.add('active-card');
    }
}

// Fetch Data from Python Flask Endpoint
async function fetchReleaseNotes() {
    setLoadingState(true);
    warningBanner.style.display = 'none';
    
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success) {
            releaseNotes = data.releases;
            
            // Display warnings if utilizing cache
            if (data.source === 'cache') {
                warningMessage.textContent = data.warning || 'Displaying cached updates. Fetch error occurred.';
                warningBanner.style.display = 'flex';
            }
            
            // Update timestamp
            lastUpdatedText.textContent = `Last fetched: ${data.last_fetched || 'Just now'}`;
            
            // Populate stats and draw UI
            calculateStatistics();
            renderTimeline();
        } else {
            showErrorState(data.error || 'Failed to fetch release logs.');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showErrorState('Network error: Unable to contact the Flask server.');
    } finally {
        setLoadingState(false);
    }
}

// Loading Spinner Trigger
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshIcon.classList.add('spin');
        btnRefresh.disabled = true;
        skeletonLoader.style.display = 'block';
        releasesTimeline.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        refreshIcon.classList.remove('spin');
        btnRefresh.disabled = false;
        skeletonLoader.style.display = 'none';
        releasesTimeline.style.display = 'block';
    }
}

// Handle Errors Visually
function showErrorState(message) {
    releasesTimeline.innerHTML = '';
    warningMessage.textContent = message;
    warningBanner.style.display = 'flex';
    warningBanner.className = 'alert-banner alert-warning'; // can style as error if needed
}

// Compute Statistics on Current Data set
function calculateStatistics() {
    let totalCount = 0;
    let featureCount = 0;
    let announcementCount = 0;
    let breakingCount = 0;
    
    releaseNotes.forEach(entry => {
        entry.updates.forEach(update => {
            totalCount++;
            const type = update.type.toLowerCase();
            if (type.includes('feature')) {
                featureCount++;
            } else if (type.includes('announcement')) {
                announcementCount++;
            } else if (type.includes('breaking') || type.includes('deprecated') || type.includes('change')) {
                breakingCount++;
            }
        });
    });
    
    // Animate stats numbers
    animateNumber(statTotal, totalCount);
    animateNumber(statFeatures, featureCount);
    animateNumber(statAnnouncements, announcementCount);
    animateNumber(statBreaking, breakingCount);
}

// Simple counter animation
function animateNumber(element, target) {
    let current = parseInt(element.textContent) || 0;
    if (current === target) return;
    
    const duration = 500; // ms
    const stepTime = 30; // ms
    const steps = duration / stepTime;
    const increment = (target - current) / steps;
    let step = 0;
    
    const interval = setInterval(() => {
        current += increment;
        step++;
        if (step >= steps) {
            element.textContent = target;
            clearInterval(interval);
        } else {
            element.textContent = Math.round(current);
        }
    }, stepTime);
}

// Render Timeline Content
function renderTimeline() {
    releasesTimeline.innerHTML = '';
    let renderedCount = 0;

    releaseNotes.forEach(entry => {
        // Filter updates inside the entry
        const filteredUpdates = entry.updates.filter(update => {
            // Type Filter
            if (activeFilter !== 'all') {
                // If filter is breaking, group with deprecated
                if (activeFilter === 'Breaking Change') {
                    if (update.type !== 'Breaking Change' && update.type !== 'Deprecated') return false;
                } else if (update.type !== activeFilter) {
                    return false;
                }
            }
            
            // Search Filter
            if (searchQuery) {
                const textContent = (update.type + ' ' + stripHtml(update.body)).toLowerCase();
                if (!textContent.includes(searchQuery)) return false;
            }
            
            return true;
        });

        // If this entry has updates remaining after filters, render it
        if (filteredUpdates.length > 0) {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.innerHTML = `<i class="fa-regular fa-calendar-days"></i> <span>${entry.date}</span>`;
            dateGroup.appendChild(divider);

            filteredUpdates.forEach(update => {
                const card = document.createElement('div');
                card.className = 'update-card';
                card.setAttribute('data-type', update.type);
                
                // Get FontAwesome icon for update type
                const iconClass = getTypeIconClass(update.type);
                const badgeClass = getBadgeClass(update.type);
                
                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-metadata">
                            <span class="type-badge ${badgeClass}">
                                <i class="${iconClass}"></i> ${update.type}
                            </span>
                            <span class="card-date">${entry.date}</span>
                        </div>
                        <div class="card-actions">
                            <button class="action-btn copy-btn" title="Copy to Clipboard" onclick="copyUpdateToClipboard('${entry.date}', '${update.type}', ${JSON.stringify(encodeURIComponent(update.body))}, this)">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                            <button class="action-btn tweet-btn" title="Compose Tweet for this update" onclick="openTweetComposer('${entry.date}', '${update.type}', ${JSON.stringify(encodeURIComponent(update.body))})">
                                <i class="fa-brands fa-x-twitter"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        ${update.body}
                    </div>
                `;
                dateGroup.appendChild(card);
                renderedCount++;
            });

            releasesTimeline.appendChild(dateGroup);
        }
    });

    // Toggle Empty State
    if (renderedCount === 0) {
        emptyState.style.display = 'flex';
        releasesTimeline.style.display = 'none';
    } else {
        emptyState.style.display = 'block';
        releasesTimeline.style.display = 'block';
    }
}

// Helpers for specific update types icons
function getTypeIconClass(type) {
    switch(type) {
        case 'Feature': return 'fa-solid fa-wand-magic-sparkles';
        case 'Announcement': return 'fa-solid fa-bullhorn';
        case 'Deprecated': return 'fa-solid fa-ban';
        case 'Breaking Change': return 'fa-solid fa-circle-exclamation';
        default: return 'fa-solid fa-circle-info';
    }
}

// Badge coloring CSS class names
function getBadgeClass(type) {
    switch(type) {
        case 'Feature': return 'badge-feature';
        case 'Announcement': return 'badge-announcement';
        case 'Deprecated': return 'badge-deprecated';
        case 'Breaking Change': return 'badge-breaking';
        default: return 'badge-general';
    }
}

// Utility to strip HTML tags
function stripHtml(html) {
    const doc = new Parser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// Minimal Browser Parser Mock for DOM purposes
function Parser() {}
Parser.prototype.parseFromString = function(markup, mimeType) {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = markup;
    return doc;
};

// ==========================================
// TWITTER COMPOSER & SHARING MODAL LOGIC
// ==========================================

// Open composer with default template content
window.openTweetComposer = function(date, type, encodedBody) {
    const bodyHtml = decodeURIComponent(encodedBody);
    const cleanBodyText = cleanTextForTweet(bodyHtml);
    
    // Construct base tweet context
    selectedUpdateForTweet = {
        date: date,
        type: type,
        bodyText: cleanBodyText
    };
    
    // Reset hashtag active buttons
    hashtagTags.forEach(tag => {
        const text = tag.getAttribute('data-tag');
        if (text === '#BigQuery' || text === '#GoogleCloud') {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });

    // Build the initial text
    generateTweetContent();
    
    // Open Modal visually
    twitterModal.style.display = 'flex';
    setTimeout(() => {
        twitterModal.classList.add('open');
    }, 10);
    
    // Focus textarea
    tweetTextarea.focus();
};

// Clean HTML into simple string and truncate
function cleanTextForTweet(html) {
    let text = stripHtml(html);
    
    // Clean up spaces, double lines
    text = text.replace(/\s+/g, ' ').trim();
    
    // Replace markdown-style links with just text or clean names
    text = text.replace(/Link:\s*/gi, '');
    
    return text;
}

// Combine template elements to make the tweet
function generateTweetContent() {
    if (!selectedUpdateForTweet) return;
    
    const prefix = `BigQuery Update (${selectedUpdateForTweet.date}) - [${selectedUpdateForTweet.type}]: `;
    const activeTags = getSelectedHashtags().join(' ');
    const suffix = activeTags ? `\n\n${activeTags}` : '';
    
    // Twitter character limit is 280
    const availableLength = 280 - prefix.length - suffix.length - 5; // buffer
    let bodyText = selectedUpdateForTweet.bodyText;
    
    if (bodyText.length > availableLength) {
        bodyText = bodyText.substring(0, availableLength - 3) + '...';
    }
    
    tweetTextarea.value = `${prefix}${bodyText}${suffix}`;
    updateTweetStats();
}

// Retrieve selected hashtags
function getSelectedHashtags() {
    const tags = [];
    hashtagTags.forEach(tag => {
        if (tag.classList.contains('active')) {
            tags.push(tag.getAttribute('data-tag'));
        }
    });
    return tags;
}

// Toggle tag on click
function toggleHashtag(tag, element) {
    let text = tweetTextarea.value.trim();
    
    if (element.classList.contains('active')) {
        element.classList.remove('active');
        // Remove tag and cleanup any double spaces
        const regex = new RegExp(`\\s*${tag}\\b`, 'g');
        text = text.replace(regex, '');
    } else {
        element.classList.add('active');
        if (!text.includes(tag)) {
            text += ' ' + tag;
        }
    }
    
    tweetTextarea.value = text.replace(/\s+/g, ' ').trim();
    updateTweetStats();
}

// Update counters and live preview screen
function updateTweetStats() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    charCount.textContent = len;
    
    // Color alert classes
    charCounter.className = 'character-counter';
    btnSubmitTweet.disabled = false;
    
    if (len > 280) {
        charCounter.classList.add('error');
        btnSubmitTweet.disabled = true;
    } else if (len > 240) {
        charCounter.classList.add('warning');
    }
    
    // Update live preview block
    tweetPreviewText.innerHTML = formatTweetPreview(text);
}

// Format hashtags in preview to look blue
function formatTweetPreview(text) {
    if (!text) return "<i>Tweet preview is empty...</i>";
    
    // Sanitize basic tags
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Highlight hashtags
    escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: var(--twitter-blue);">$1</span>');
    
    return escaped;
}

// Submit tweet - open twitter sharing intent
function submitTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
    
    closeTwitterModal();
}

// Close twitter composer
function closeTwitterModal() {
    twitterModal.classList.remove('open');
    setTimeout(() => {
        twitterModal.style.display = 'none';
        selectedUpdateForTweet = null;
    }, 300);
}

// Toggle page theme (Dark/Light)
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    
    // Cache preference locally
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Toggle sun/moon iconography
    if (themeIcon) {
        themeIcon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

// Copy update details to clipboard
window.copyUpdateToClipboard = function(date, type, encodedBody, button) {
    const bodyHtml = decodeURIComponent(encodedBody);
    const cleanText = cleanTextForTweet(bodyHtml);
    const textToCopy = `BigQuery Update (${date}) - [${type}]: ${cleanText}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        // Change icon to a checkmark for feedback
        const icon = button.querySelector('i');
        icon.className = 'fa-solid fa-check';
        icon.style.color = 'var(--color-feature)';
        
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy';
            icon.style.color = '';
        }, 1500);
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        alert('Failed to copy to clipboard.');
    });
};

// Export active filtered releases list to CSV file
window.exportToCsv = function() {
    if (releaseNotes.length === 0) {
        alert("No release notes available to export.");
        return;
    }
    
    // Header row
    let csvContent = "Date,Type,Description\r\n";
    
    let rowsCount = 0;
    releaseNotes.forEach(entry => {
        const filteredUpdates = entry.updates.filter(update => {
            // Type Filter
            if (activeFilter !== 'all') {
                if (activeFilter === 'Breaking Change') {
                    if (update.type !== 'Breaking Change' && update.type !== 'Deprecated') return false;
                } else if (update.type !== activeFilter) {
                    return false;
                }
            }
            
            // Search Filter
            if (searchQuery) {
                const textContent = (update.type + ' ' + stripHtml(update.body)).toLowerCase();
                if (!textContent.includes(searchQuery)) return false;
            }
            
            return true;
        });
        
        filteredUpdates.forEach(update => {
            const date = entry.date.replace(/"/g, '""');
            const type = update.type.replace(/"/g, '""');
            const cleanBody = stripHtml(update.body).replace(/\s+/g, ' ').trim().replace(/"/g, '""');
            
            csvContent += `"${date}","${type}","${cleanBody}"\r\n`;
            rowsCount++;
        });
    });
    
    if (rowsCount === 0) {
        alert("No release notes found to export with the current filter settings.");
        return;
    }
    
    // Create Blob & Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${activeFilter.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
