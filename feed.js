// feed.js
// Fetches feed items from Supabase and displays them on the page.

import { supabase } from './supabase-client.js';

const feedContainer = document.getElementById('feed-container');

/**
 * Formats a timestamp into a more readable format.
 * @param {string} isoString - The ISO 8601 timestamp from the database.
 * @returns {string} A formatted date string.
 */
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Sets up an Intersection Observer to animate elements as they scroll into view.
 */
function setupScrollAnimations() {
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Add a small delay for the initial page hero animation
            const delay = entry.target.classList.contains('page-hero') ? 100 : 0;
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, delay);
                // Optional: stop observing once it's visible
                // observer.unobserve(entry.target);
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
        // Add Tailwind CSS classes for the card layout and animation
        feedElement.className = 'bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg flex flex-col md:flex-row gap-4 md:gap-6 p-6 animate-on-scroll';
        
        const displayTimestamp = item.timestamp ? formatTimestamp(item.timestamp) : formatTimestamp(item.created_at);

        feedElement.innerHTML = `
            <div class="flex-shrink-0 w-full md:w-48 text-left md:text-right border-b md:border-b-0 md:border-r border-gray-700 pb-3 md:pb-0 md:pr-6">
                <div class="text-sm font-semibold text-teal-400">${displayTimestamp}</div>
            </div>
            <div class="feed-content flex-grow pt-3 md:pt-0">
                <h4 class="text-xl font-bold text-white mb-2">${item.title}</h4>
                <p class="text-gray-300 leading-relaxed">${item.content}</p>
            </div>
        `;
        feedContainer.appendChild(feedElement);
    });

    // Re-run the Intersection Observer for all animated elements (initial hero + new feed items)
    setupScrollAnimations();
}

// Set up animations for static elements first, then load the dynamic feed
document.addEventListener('DOMContentLoaded', () => {
    setupScrollAnimations(); // For the hero section
    loadFeed();
});
