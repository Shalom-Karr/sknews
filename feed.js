// feed.js
// Fetches feed items, displays them in a news layout, and handles modal interaction.

import { supabase } from './supabase-client.js';

// DOM Element References
const featuredContainer = document.getElementById('featured-article-container');
const feedContainer = document.getElementById('feed-container');
const modal = document.getElementById('article-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- MODAL LOGIC ---
function openModal(title, content) {
    modalTitle.textContent = title;
    modalContent.innerHTML = content.replace(/\n/g, '<p class="mt-4"></p>'); // Preserve paragraphs
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

// --- UTILITY FUNCTIONS ---
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

// --- CORE FEED LOGIC ---
async function loadFeed() {
    const { data: feedItems, error } = await supabase
        .from('feed')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching feed:', error);
        feedContainer.innerHTML = `<p class="text-center text-red-400 md:col-span-2">Could not load the feed. Please try again later.</p>`;
        return;
    }

    if (feedItems.length === 0) {
        feedContainer.innerHTML = `<p class="text-center text-gray-400 md:col-span-2">No updates yet. Check back soon!</p>`;
        return;
    }

    // Clear loading messages
    featuredContainer.innerHTML = '';
    feedContainer.innerHTML = '';

    // Separate the first item to be featured
    const featuredItem = feedItems.shift(); 
    
    // Create and display the featured article
    if (featuredItem) {
        const featuredElement = document.createElement('div');
        featuredElement.className = 'group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-800/50 border border-teal-500/30 rounded-lg shadow-2xl p-6 sm:p-8 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-teal-500/20';
        
        const displayTimestamp = formatTimestamp(featuredItem.created_at || featuredItem.timestamp);
        
        featuredElement.innerHTML = `
            <div class="text-sm font-semibold text-teal-400 mb-3">LATEST UPDATE</div>
            <h3 class="text-2xl sm:text-3xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors">${featuredItem.title}</h3>
            <p class="text-gray-400 leading-relaxed line-clamp-4">${featuredItem.content}</p>
            <div class="text-xs text-gray-500 mt-4">${displayTimestamp}</div>
        `;
        // Add click listener to the entire card
        featuredElement.addEventListener('click', () => openModal(featuredItem.title, featuredItem.content));
        featuredContainer.appendChild(featuredElement);
    }

    // Create and display the rest of the articles in a grid
    feedItems.forEach(item => {
        const feedElement = document.createElement('div');
        feedElement.className = 'group cursor-pointer bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-teal-500/20';
        
        const displayTimestamp = formatTimestamp(item.created_at || item.timestamp);

        feedElement.innerHTML = `
            <h4 class="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">${item.title}</h4>
            <p class="text-gray-400 leading-relaxed line-clamp-3 mb-4">${item.content}</p>
            <div class="text-xs text-gray-500">${displayTimestamp}</div>
        `;
        // Add click listener to the entire card
        feedElement.addEventListener('click', () => openModal(item.title, item.content));
        feedContainer.appendChild(feedElement);
    });

    // Re-run the Intersection Observer for all newly added elements
    setupScrollAnimations();
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    setupScrollAnimations(); // For static elements like the hero
    loadFeed();
});
