import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qvoxpfigbukidlmshiei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2b3hwZmlnYnVraWRsbXNoaWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTM2OTEsImV4cCI6MjA2NTg2OTY5MX0.CEbyeIw6QiMxbLBhU7x7Re7SL_unWJMyaJQPS9y-k60';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let userIP = null;
let startTime = Date.now();
let maxScroll = 0;

// 1. Session Management (Persists per browser tab)
function getSessionID() {
    let sid = sessionStorage.getItem('analytics_session_id');
    if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem('analytics_session_id', sid);
    }
    return sid;
}

// 2. IP Handling
async function getIP() {
    if (userIP) return userIP;
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        userIP = data.ip;
        return userIP;
    } catch (e) { return 'unknown'; }
}

// 3. Environment Info
function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Firefox") > -1) return "Firefox";
    if (ua.indexOf("SamsungBrowser") > -1) return "Samsung Internet";
    if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return "Opera";
    if (ua.indexOf("Edge") > -1) return "Edge";
    if (ua.indexOf("Chrome") > -1) return "Chrome";
    if (ua.indexOf("Safari") > -1) return "Safari";
    return "Unknown";
}

function getOSInfo() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "MacOS";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    if (ua.indexOf("Android") !== -1) return "Android";
    if (ua.indexOf("like Mac") !== -1) return "iOS";
    return "Unknown OS";
}

function getPageName() {
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('/') || path.endsWith('index.html')) return 'Home';
    if (path.includes('feed')) return 'News Feed';
    if (path.includes('news')) return 'News Home';
    return document.title || 'Unknown Page';
}

// 4. Main Tracking Function
window.trackEvent = async function(eventType, extraData = {}) {
    const ip = await getIP();
    
    const payload = {
        event_type: eventType,
        page_name: getPageName(),
        page_url: window.location.href,
        ip_address: ip,
        session_id: getSessionID(),
        meta: {
            browser: getBrowserInfo(),
            os: getOSInfo(),
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            referrer: document.referrer || 'Direct'
        },
        event_data: extraData
    };

    const { error } = await supabase.from('news_website_visitors').insert([payload]);
    if (error) console.error("Tracking Error:", error);
};

// 5. Automated Event Listeners

// A. Track Page Load
(async () => {
    if (!window.location.search.includes('action=')) { // Don't track admin actions as page views
        window.trackEvent('page_view', { 
            load_time: window.performance?.now() || 0 
        });
    }
})();

// B. Track Clicks (Buttons & Links)
document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, input[type="submit"], .clickable');
    if (target) {
        const label = target.innerText || target.id || target.getAttribute('aria-label') || 'Unknown Element';
        const type = target.tagName.toLowerCase();
        
        // Don't await this, let it fire and forget
        window.trackEvent('click', {
            element_text: label.substring(0, 50),
            element_type: type,
            element_id: target.id || null,
            target_url: target.href || null
        });
    }
});

// C. Track Scroll Depth
window.addEventListener('scroll', () => {
    const h = document.documentElement, b = document.body;
    const st = 'scrollTop', sh = 'scrollHeight';
    const percent = Math.round((h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight) * 100);
    if (percent > maxScroll) maxScroll = percent;
});

// D. Track Page Leave (Time spent & Scroll)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        const timeSpent = Math.round((Date.now() - startTime) / 1000); // Seconds
        // Only track if they spent at least 2 seconds
        if (timeSpent > 2) {
            navigator.sendBeacon ? 
                null : // Supabase doesn't support beacon easily, so we try a standard fetch
                window.trackEvent('page_leave', {
                    time_on_page_sec: timeSpent,
                    max_scroll_pct: maxScroll
                });
        }
    }
});
