// feed.js
// Fetches feed items with a skeleton loader and uses POLLING for live updates.

import { supabase } from './supabase-client.js';

// DOM Element References
const featuredContainer = document.getElementById('featured-article-container');
const feedContainer = document.getElementById('feed-container');
const modal = document.getElementById('article-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

// ---> NEW: State variable to track the timestamp of the latest post for polling.
let latestPostTimestamp = null;

// --- MODAL & UTILITY FUNCTIONS (Unchanged) ---
function openModal(title, content, senderName, timestamp) {
    modalTitle.textContent = title;
    const formattedContent = content.replace(/\n/g, '<p class="mt-4"></p>');
    const footerHTML = `
        <div class="mt-8 pt-4 border-t border-gray-600 flex justify-between items-center text-sm text-gray-500">
            <span>Posted by <strong class="font-semibold text-teal-400">${senderName || 'SK News'}</strong></span>
            <span>${timestamp}</span>
        </div>
    `;
    modalContent.innerHTML = formattedContent + footerHTML;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

modalCloseBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

function formatTimestamp(isoString) {
    if (!isoString) return 'Date not available';
    const date = new Date(isoString);
    if (isNaN(date)) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function setupScrollAnimations() {
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    scrollElements.forEach(el => observer.observe(el));
}

function displaySkeletonLoader() {
    const featuredSkeleton = `<div class="bg-gray-800/80 border border-gray-700/50 rounded-lg shadow-2xl p-6 sm:p-8 animate-pulse"><div class="h-4 bg-gray-700 rounded w-1/4 mb-4"></div><div class="h-8 bg-gray-700 rounded w-3/4 mb-4"></div><div class="h-5 bg-gray-700 rounded w-full mb-2"></div><div class="h-5 bg-gray-700 rounded w-5/6 mb-2"></div><div class="h-5 bg-gray-700 rounded w-1/2 mb-4"></div><div class="h-3 bg-gray-700 rounded w-1/3 mt-4"></div></div>`;
    featuredContainer.innerHTML = featuredSkeleton;
    let gridSkeleton = '';
    for (let i = 0; i < 4; i++) {
        gridSkeleton += `<div class="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-pulse"><div class="h-6 bg-gray-700 rounded w-5/6 mb-3"></div><div class="h-4 bg-gray-700 rounded w-full mb-2"></div><div class="h-4 bg-gray-700 rounded w-full mb-4"></div><div class="h-3 bg-gray-700 rounded w-1/2"></div></div>`;
    }
    feedContainer.innerHTML = gridSkeleton;
}

function createFeedElement(item, isFeatured) {
    const element = document.createElement('div');
    const displayTimestamp = formatTimestamp(item.created_at || item.timestamp);
    if (isFeatured) {
        element.className = 'group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-800/50 border border-teal-500/30 rounded-lg shadow-2xl p-6 sm:p-8 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-teal-500/20';
        element.innerHTML = `<div class="text-sm font-semibold text-teal-400 mb-3">LATEST UPDATE</div><h3 class="text-2xl sm:text-3xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors">${item.title}</h3><p class="text-gray-400 leading-relaxed line-clamp-4">${item.content}</p><div class="text-xs text-gray-500 mt-4">${displayTimestamp}</div>`;
    } else {
        element.className = 'group cursor-pointer bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-teal-500/20';
        element.innerHTML = `<h4 class="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">${item.title}</h4><p class="text-gray-400 leading-relaxed line-clamp-3 mb-4">${item.content}</p><div class="text-xs text-gray-500">${displayTimestamp}</div>`;
    }
    element.addEventListener('click', () => openModal(item.title, item.content, item.sender_name, displayTimestamp));
    return element;
}

// --- CORE FEED LOGIC ---
async function loadFeed() {
    const { data, error } = await supabase.from('feed').select('*').order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching feed:', error);
        featuredContainer.innerHTML = '';
        feedContainer.innerHTML = `<p class="text-center text-red-400 md:col-span-2">Could not load the feed. Please try again later.</p>`;
        return;
    }
    if (data.length === 0) {
        featuredContainer.innerHTML = '';
        feedContainer.innerHTML = `<p class="text-center text-gray-400 md:col-span-2">No updates yet. Check back soon!</p>`;
        return;
    }

    // ---> MODIFIED: Store the timestamp of the very newest post.
    latestPostTimestamp = data[0].created_at;

    featuredContainer.innerHTML = '';
    feedContainer.innerHTML = '';

    const featuredItem = data.shift();
    if (featuredItem) {
        const featuredElement = createFeedElement(featuredItem, true);
        featuredContainer.appendChild(featuredElement);
    }

    data.forEach(item => {
        const feedElement = createFeedElement(item, false);
        feedContainer.appendChild(feedElement);
    });
    
    setupScrollAnimations();
}

// ---> NEW: Function to check for new posts using polling.
async function checkForNewPosts() {
    if (!latestPostTimestamp) return; // Don't check if initial load hasn't happened

    const { data: newItems, error } = await supabase
        .from('feed')
        .select('*')
        .gt('created_at', latestPostTimestamp) // Fetch only posts NEWER than our latest one
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error polling for new posts:", error);
        return;
    }

    if (newItems && newItems.length > 0) {
        console.log(`Found ${newItems.length} new post(s)!`);
        latestPostTimestamp = newItems[0].created_at; // Update to the newest timestamp

        // Logic to prepend new items and demote the old featured one
        const oldFeaturedElement = featuredContainer.querySelector('div');
        
        // Make the newest item the new featured article
        const newFeaturedItem = newItems.shift();
        const newFeaturedElement = createFeedElement(newFeaturedItem, true);
        featuredContainer.innerHTML = '';
        featuredContainer.appendChild(newFeaturedElement);
        
        // Animate its appearance
        newFeaturedElement.classList.add('is-visible');
        newFeaturedElement.style.opacity = '0';
        setTimeout(() => { newFeaturedElement.style.transition = 'opacity 0.5s'; newFeaturedElement.style.opacity = '1'; }, 50);

        // Demote the old featured article to a regular grid item
        if (oldFeaturedElement) {
             const title = oldFeaturedElement.querySelector('h3').textContent;
             const content = oldFeaturedElement.querySelector('p').textContent;
             // We need to rebuild the item object to create a standard card
             const demotedItem = { title, content, created_at: null, sender_name: null }; // Timestamps/sender might be lost here, but it's a visual demotion
             const demotedElement = createFeedElement(demotedItem, false);
             feedContainer.prepend(demotedElement);
        }
        
        // Add any other new items (if more than one came in) to the top of the grid
        newItems.forEach(item => {
            const el = createFeedElement(item, false);
            feedContainer.prepend(el);
        });
    }
}


// --- RUN ON PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    displaySkeletonLoader();
    loadFeed();
    // ---> NEW: Start polling for new posts every 15 seconds.
    setInterval(checkForNewPosts, 15000); // 15000 milliseconds = 15 seconds
});
