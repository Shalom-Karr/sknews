// feed.js
// Fetches feed items, displays them, and handles modal interaction.

import { supabase } from './supabase-client.js';

const feedContainer = document.getElementById('feed-container');
const modal = document.getElementById('article-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

/**
 * Opens the article modal and populates it with content.
 * @param {string} title - The title of the article.
 * @param {string} content - The HTML content of the article.
 */
function openModal(title, content) {
    modalTitle.textContent = title;
    // Use innerHTML to render any HTML formatting in the content (e.g., links, bold)
    modalContent.innerHTML = content.replace(/\n/g, '<br>'); // Simple way to preserve line breaks
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Closes the article modal.
 */
function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore background scrolling
}

// --- Event Listeners for Modal ---
// Close modal by clicking the 'X' button
modalCloseBtn.addEventListener('click', closeModal);

// Close modal by clicking on the background overlay
modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Close modal by pressing the 'Escape' key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
    }
});


/**
 * Formats a timestamp into a more readable format.
 * @param {string} isoString - The ISO 8601 timestamp from the database.
 * @returns {string} A formatted date string.
 */
function formatTimestamp(isoString) {
    if (!isoString) return 'Date not available';
    const date = new Date(isoString);
    if (isNaN(date)) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Sets up an Intersection Observer to animate elements as they scroll into view.
 */
function setupScrollAnimations() {
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Stop observing once visible for performance
            }
        });
    }, { threshold: 0.1 });
    scrollElements.forEach(el => observer.observe(el));
}

/**
 * Fetches and displays all items from the 'feed' table.
 */
async function loadFeed() {
    const { data: feedItems, error } = await supabase
        .from('feed')
        .select('*')
        .order('created_at', { ascending: false }); // Show newest items first

    if (error) {
        console.error('Error fetching feed:', error);
        feedContainer.innerHTML = `<p class="text-center text-red-400">Could not load the feed at this time. Please try again later.</p>`;
        return;
    }

    if (feedItems.length === 0) {
        feedContainer.innerHTML = `<p class="text-center text-gray-400">No updates yet. Check back soon!</p>`;
        return;
    }

    // Clear the "Loading..." message
    feedContainer.innerHTML = '';

    // Create and append an HTML element for each feed item
    feedItems.forEach(item => {
        const feedElement = document.createElement('div');
        // --- 3D Card Styling with hover effects ---
        feedElement.className = 'bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-teal-500/20';
        
        // --- Date Fix: Prioritize created_at, fallback to timestamp ---
        const displayTimestamp = formatTimestamp(item.created_at || item.timestamp);

        feedElement.innerHTML = `
            <div class="feed-content">
                <div class="text-sm font-semibold text-teal-400 mb-3">${displayTimestamp}</div>
                <h4 class="text-xl font-bold text-white mb-2 cursor-pointer hover:text-teal-300 transition-colors">${item.title}</h4>
                <p class="text-gray-400 leading-relaxed line-clamp-3">${item.content}</p>
            </div>
        `;
        
        // Add click event listener to the headline
        const headline = feedElement.querySelector('h4');
        headline.addEventListener('click', () => {
            openModal(item.title, item.content);
        });

        feedContainer.appendChild(feedElement);
    });

    // Re-run the Intersection Observer for all animated elements (initial hero + new feed items)
    setupScrollAnimations();
}

// Set up animations for static elements first, then load the dynamic feed
document.addEventListener('DOMContentLoaded', () => {
    setupScrollAnimations(); // For the static hero section
    loadFeed();
});
