// feed.js
// Fetches feed items, displays them with a skeleton loader, handles real-time updates, and manages modal interaction.

import { supabase } from './supabase-client.js';

// DOM Element References
const featuredContainer = document.getElementById('featured-article-container');
const feedContainer = document.getElementById('feed-container');
const modal = document.getElementById('article-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

// ---> NEW: State variable to keep track of the latest item for real-time updates.
let currentFeedItems = [];

// --- MODAL LOGIC (Unchanged) ---
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


// --- UTILITY FUNCTIONS (Unchanged) ---
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


// ---> NEW: Function to display skeleton loaders
function displaySkeletonLoader() {
    // Skeleton for the featured article
    const featuredSkeleton = `
        <div class="bg-gray-800/80 border border-gray-700/50 rounded-lg shadow-2xl p-6 sm:p-8 animate-pulse">
            <div class="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div class="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div class="h-5 bg-gray-700 rounded w-full mb-2"></div>
            <div class="h-5 bg-gray-700 rounded w-5/6 mb-2"></div>
            <div class="h-5 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div class="h-3 bg-gray-700 rounded w-1/3 mt-4"></div>
        </div>
    `;
    featuredContainer.innerHTML = featuredSkeleton;

    // Skeletons for the grid articles
    let gridSkeleton = '';
    for (let i = 0; i < 4; i++) {
        gridSkeleton += `
            <div class="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-pulse">
                <div class="h-6 bg-gray-700 rounded w-5/6 mb-3"></div>
                <div class="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div class="h-4 bg-gray-700 rounded w-full mb-4"></div>
                <div class="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
        `;
    }
    feedContainer.innerHTML = gridSkeleton;
}

// ---> REFACTORED: Creates a single feed item element (featured or regular)
function createFeedElement(item, isFeatured) {
    const element = document.createElement('div');
    const displayTimestamp = formatTimestamp(item.created_at || item.timestamp);

    if (isFeatured) {
        element.className = 'group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-800/50 border border-teal-500/30 rounded-lg shadow-2xl p-6 sm:p-8 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-teal-500/20';
        element.innerHTML = `
            <div class="text-sm font-semibold text-teal-400 mb-3">LATEST UPDATE</div>
            <h3 class="text-2xl sm:text-3xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors">${item.title}</h3>
            <p class="text-gray-400 leading-relaxed line-clamp-4">${item.content}</p>
            <div class="text-xs text-gray-500 mt-4">${displayTimestamp}</div>
        `;
    } else {
        element.className = 'group cursor-pointer bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-teal-500/20';
        element.innerHTML = `
            <h4 class="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">${item.title}</h4>
            <p class="text-gray-400 leading-relaxed line-clamp-3 mb-4">${item.content}</p>
            <div class="text-xs text-gray-500">${displayTimestamp}</div>
        `;
    }

    element.addEventListener('click', () => openModal(item.title, item.content, item.sender_name, displayTimestamp));
    return element;
}

// --- CORE FEED LOGIC ---
async function loadFeed() {
    const { data, error } = await supabase
        .from('feed')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching feed:', error);
        featuredContainer.innerHTML = ''; // Clear skeleton
        feedContainer.innerHTML = `<p class="text-center text-red-400 md:col-span-2">Could not load the feed. Please try again later.</p>`;
        return;
    }
    
    currentFeedItems = data; // Store the fetched items

    if (currentFeedItems.length === 0) {
        featuredContainer.innerHTML = ''; // Clear skeleton
        feedContainer.innerHTML = `<p class="text-center text-gray-400 md:col-span-2">No updates yet. Check back soon!</p>`;
        return;
    }

    // Clear skeletons
    featuredContainer.innerHTML = '';
    feedContainer.innerHTML = '';

    // Create and display the featured article
    const featuredItem = currentFeedItems.shift(); 
    if (featuredItem) {
        const featuredElement = createFeedElement(featuredItem, true);
        featuredContainer.appendChild(featuredElement);
    }

    // Create and display the rest of the articles
    currentFeedItems.forEach(item => {
        const feedElement = createFeedElement(item, false);
        feedContainer.appendChild(feedElement);
    });
    
    // Put the featured item back at the start of the array for state consistency
    if (featuredItem) {
        currentFeedItems.unshift(featuredItem);
    }

    // Set up animations for the newly loaded elements
    setupScrollAnimations();
}

// ---> NEW: Function to handle real-time updates from Supabase
function subscribeToLiveUpdates() {
    supabase
      .channel('public:feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed' }, payload => {
        console.log('New live update received!', payload.new);
        
        const newItem = payload.new;
        const oldFeaturedItem = currentFeedItems.length > 0 ? currentFeedItems[0] : null;

        // 1. Create the new featured article element
        const newFeaturedElement = createFeedElement(newItem, true);
        
        // 2. Clear the old featured article
        featuredContainer.innerHTML = '';
        featuredContainer.appendChild(newFeaturedElement);
        
        // 3. If there was an old featured article, demote it to a regular grid item
        if (oldFeaturedItem) {
            const demotedElement = createFeedElement(oldFeaturedItem, false);
            feedContainer.prepend(demotedElement); // Add it to the top of the grid
        }

        // 4. Update the global state
        currentFeedItems.unshift(newItem);
        
        // 5. Animate the new element's appearance
        newFeaturedElement.classList.add('is-visible'); // Bypass scroll animation
        newFeaturedElement.style.opacity = '0';
        newFeaturedElement.style.transform = 'translateY(-15px)';
        setTimeout(() => {
            newFeaturedElement.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
            newFeaturedElement.style.opacity = '1';
            newFeaturedElement.style.transform = 'translateY(0)';
        }, 50); // Short delay to ensure transition applies

      })
      .subscribe();
}

// ---> UPDATED: Run functions on page load in order
document.addEventListener('DOMContentLoaded', () => {
    displaySkeletonLoader(); // 1. Show placeholders immediately
    loadFeed();              // 2. Fetch and display initial data
    subscribeToLiveUpdates();// 3. Listen for future real-time updates
});
