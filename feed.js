// feed.js
// Fetches feed items from Supabase and displays them on the page.

import { supabase } from './supabase-client.js';

const feedContainer = document.getElementById('feed-container');

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
        feedContainer.innerHTML = '<p>Could not load the feed at this time. Please try again later.</p>';
        return;
    }

    if (feedItems.length === 0) {
        feedContainer.innerHTML = '<p>No updates yet. Check back soon!</p>';
        return;
    }

    // Clear any existing content
    feedContainer.innerHTML = '';

    // Create and append an HTML element for each feed item
    feedItems.forEach(item => {
        const feedElement = document.createElement('div');
        feedElement.classList.add('feed-item', 'animate-on-scroll');
        
        feedElement.innerHTML = `
            <div class="feed-timestamp">${item.timestamp}</div>
            <div class="feed-content">
                <h4>${item.title}</h4>
                <p>${item.content}</p>
            </div>
        `;
        feedContainer.appendChild(feedElement);
    });

    // Re-run the Intersection Observer for the new dynamic elements
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });
    scrollElements.forEach(el => observer.observe(el));
}

// Load the feed when the page is ready
document.addEventListener('DOMContentLoaded', loadFeed);