// feed.js
// Fetches feed items with a skeleton loader and uses POLLING for live updates.

import { supabase } from './supabase-client.js';

// --- DEBOUNCE UTILITY ---
const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};
// --- END DEBOUNCE UTILITY ---


// DOM Element References
const featuredContainer = document.getElementById('featured-article-container');
const feedContainer = document.getElementById('feed-container');
const modal = document.getElementById('article-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content'); 
const modalContentContainer = document.getElementById('modal-content-container'); 
const modalCloseBtn = document.getElementById('modal-close-btn'); 
const searchInput = document.getElementById('feed-search-input'); 
const feedStartDate = document.getElementById('feed-start-date'); 
const feedEndDate = document.getElementById('feed-end-date');     
const newPostsIndicator = document.getElementById('new-posts-indicator'); 

// Navigation References
const modalPrevBtn = document.getElementById('modal-prev-btn');
const modalNextBtn = document.getElementById('modal-next-btn');
const articleCounter = document.getElementById('article-counter'); 

// Custom Dropdown References
const posterDropdownBtn = document.getElementById('poster-dropdown-btn');
const posterSelectedText = document.getElementById('poster-selected-text');
const posterDropdownOptions = document.getElementById('poster-dropdown-options');
let currentPosterFilterValue = ''; // Replaces the value property of the native select

// State variables
let latestPostTimestamp = null;
let currentSearchTerm = ''; 
let filtersActive = false; 
let currentFeedData = []; 
let currentArticleIndex = -1; 


// --- UTILITY FUNCTIONS ---

function highlightText(text, term) {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const highlightStyle = 'background-color: #fcd34d; color: #1f2937; padding: 2px 0; border-radius: 2px;';
    return text.replace(regex, `<span style="${highlightStyle}">$1</span>`);
}

function formatTimestamp(isoString) {
    if (!isoString) return 'Date not available';
    const date = new Date(isoString);
    if (isNaN(date)) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Fetches the ordered list of posters from the 'poster_config' table (publicly accessible).
 * Populates the custom dropdown list.
 */
async function getUniqueSenders() {
    
    const { data: posters, error } = await supabase
        .from('poster_config')
        .select('sender_name')
        .order('display_order', { ascending: true }); // ORDERED BY ADMIN CONFIG

    if (error) {
        console.error("Error fetching poster config:", error);
        posterDropdownOptions.innerHTML = '<li class="p-3 text-red-400">Error loading posters.</li>';
        return;
    }
    
    // Clear old options and add 'All Posters'
    posterDropdownOptions.innerHTML = '';
    
    const allPostersItem = createDropdownItem("All Posters", "");
    posterDropdownOptions.appendChild(allPostersItem);

    posters.forEach(poster => {
        const item = createDropdownItem(poster.sender_name, poster.sender_name);
        posterDropdownOptions.appendChild(item);
    });
}

/**
 * Creates a single list item for the custom dropdown.
 */
function createDropdownItem(text, value) {
    const li = document.createElement('li');
    li.className = 'p-3 cursor-pointer text-gray-200 hover:bg-gray-700 transition-colors';
    li.textContent = text;
    li.dataset.value = value;
    
    li.addEventListener('click', () => {
        currentPosterFilterValue = value; // Set the global filter state
        posterSelectedText.textContent = text; // Update the button text
        posterDropdownOptions.classList.add('hidden'); // Close the dropdown
        posterDropdownBtn.classList.remove('open'); // Rotate arrow back
        
        // Visually mark the button as active if a filter is selected
        if (value) {
            posterDropdownBtn.classList.add('bg-teal-900/50', 'border-teal-700');
        } else {
            posterDropdownBtn.classList.remove('bg-teal-900/50', 'border-teal-700');
        }
        
        handleFilterChange(); // Trigger feed reload
    });
    return li;
}

/**
 * Toggle the visibility of the custom dropdown options.
 */
function togglePosterDropdown() {
    posterDropdownOptions.classList.toggle('hidden');
    posterDropdownBtn.classList.toggle('open');
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

function createFeedElement(item, isFeatured, index) {
    const element = document.createElement('div');
    const displayTimestamp = formatTimestamp(item.created_at || item.timestamp);
    
    const highlightedTitle = highlightText(item.title, currentSearchTerm);
    const highlightedContent = highlightText(item.content, currentSearchTerm);

    if (isFeatured) {
        element.className = 'group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border border-teal-500/50 rounded-lg shadow-2xl p-6 sm:p-8 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-teal-500/50 hover:ring-2 hover:ring-teal-500/50';
        element.innerHTML = `<div class="text-sm font-semibold text-teal-400 mb-3">LATEST UPDATE</div><h3 class="text-3xl sm:text-4xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors">${highlightedTitle}</h3><p class="text-gray-400 leading-relaxed line-clamp-4">${highlightedContent}</p><div class="text-xs text-gray-500 mt-4">${item.sender_name || 'SK News'} | ${displayTimestamp}</div>`;
    } else {
        element.className = 'group cursor-pointer bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:shadow-teal-500/20 hover:ring-2 hover:ring-teal-500/20';
        element.innerHTML = `<h4 class="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">${highlightedTitle}</h4><p class="text-gray-400 leading-relaxed line-clamp-3 mb-4">${highlightedContent}</p><div class="text-xs text-gray-500">${item.sender_name || 'SK News'} | ${displayTimestamp}</div>`;
    }
    element.addEventListener('click', () => openModal(index));
    return element;
}


// --- MODAL CONTROL FUNCTIONS ---

function openModal(index) {
    if (index < 0 || index >= currentFeedData.length) return;

    const item = currentFeedData[index];
    currentArticleIndex = index;
    const displayTimestamp = formatTimestamp(item.created_at || item.timestamp);
    const totalArticles = currentFeedData.length;

    modalTitle.textContent = item.title;
    articleCounter.textContent = `Article ${index + 1} of ${totalArticles}`;
    
    const contentHtml = item.content.replace(/\n/g, '<p class="mt-4"></p>');
    
    // Insert content
    modalContent.innerHTML = contentHtml;
    modalContentContainer.scrollTop = 0; // Reset scroll position
    
    // Clear existing footer before adding the new one
    const existingFooter = modalContentContainer.querySelector('#modal-footer');
    if (existingFooter) {
        existingFooter.remove();
    }
    
    const footerHTML = `
        <div id="modal-footer" class="sticky bottom-0 z-10 bg-gray-800 border-t border-gray-700/80 p-4 sm:p-6 text-sm text-gray-400 shadow-xl shadow-gray-900/50">
            <div class="flex justify-between items-center max-w-full">
                <span>Posted by <strong class="font-semibold text-teal-400">${item.sender_name || 'SK News'}</strong></span>
                <span>${displayTimestamp}</span>
            </div>
        </div>
    `;
    
    modalContentContainer.insertAdjacentHTML('beforeend', footerHTML);
    
    // Update navigation button visibility/state
    if (index === 0) {
        modalPrevBtn.classList.add('nav-btn-disabled');
    } else {
        modalPrevBtn.classList.remove('nav-btn-disabled');
    }
    
    if (index === totalArticles - 1) {
        modalNextBtn.classList.add('nav-btn-disabled');
    } else {
        modalNextBtn.classList.remove('nav-btn-disabled');
    }

    // Apply animation classes
    modal.classList.remove('hidden', 'modal-opening');
    modal.classList.add('modal-opened');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('modal-opened');
    modal.classList.add('modal-opening'); 
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('modal-opening');
        document.body.style.overflow = '';
        currentArticleIndex = -1; 
    }, 300);
}

function navigateToArticle(direction) {
    const newIndex = currentArticleIndex + direction;
    if (newIndex >= 0 && newIndex < currentFeedData.length) {
        openModal(newIndex);
    }
}


// --- CORE FEED LOGIC ---
async function loadFeed() {
    const searchTerm = searchInput.value.trim();
    const startDateValue = feedStartDate.value;
    const endDateValue = feedEndDate.value;
    const posterValue = currentPosterFilterValue; // Use custom state variable

    currentSearchTerm = searchTerm;
    filtersActive = searchTerm !== '' || startDateValue !== '' || endDateValue !== '' || posterValue !== '';

    let query = supabase.from('feed').select('*').order('created_at', { ascending: false });

    // Apply filters...
    if (searchTerm) {
        const searchPattern = `%${searchTerm}%`;
        query = query.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);
    }
    if (posterValue) {
        query = query.eq('sender_name', posterValue);
    }
    if (startDateValue) {
        query = query.gte('created_at', startDateValue);
    }
    if (endDateValue) {
        query = query.lte('created_at', endDateValue + 'T23:59:59'); 
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching feed:', error);
        featuredContainer.innerHTML = '';
        feedContainer.innerHTML = `<p class="text-center text-red-400 md:col-span-2">Could not load the feed. Please try again later.</p>`;
        return;
    }
    
    currentFeedData = data || [];

    featuredContainer.innerHTML = '';
    feedContainer.innerHTML = '';
    newPostsIndicator.classList.add('hidden'); 

    if (currentFeedData.length === 0) {
        feedContainer.innerHTML = `<p class="text-center text-gray-400 md:col-span-2">${filtersActive ? 'No results found for your filters.' : 'No updates yet. Check back soon!'}</p>`;
        return;
    }

    if (!filtersActive) {
        latestPostTimestamp = currentFeedData[0].created_at;
    }

    let itemsToRender = [...currentFeedData];
    let itemIndexOffset = 0;
    
    if (!filtersActive) {
        const featuredItem = itemsToRender.shift();
        if (featuredItem) {
            const featuredElement = createFeedElement(featuredItem, true, 0); 
            featuredContainer.appendChild(featuredElement);
            itemIndexOffset = 1;
        }
    }

    itemsToRender.forEach((item, i) => {
        const finalIndex = i + itemIndexOffset;
        const feedElement = createFeedElement(item, false, finalIndex);
        feedContainer.appendChild(feedElement);
    });
    
    setupScrollAnimations();
}

async function checkForNewPosts() {
    if (!latestPostTimestamp || filtersActive) return; 

    const { data: newItems, error } = await supabase
        .from('feed')
        .select('*')
        .gt('created_at', latestPostTimestamp) 
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error polling for new posts:", error);
        return;
    }

    if (newItems && newItems.length > 0) {
        console.log(`Found ${newItems.length} new post(s)!`);
        newPostsIndicator.classList.remove('hidden');
        latestPostTimestamp = newItems[0].created_at; 
    }
}

function handleFilterChange() {
    const term = searchInput.value.trim();
    
    if (term.length >= 3 || term.length === 0 || feedStartDate.value || feedEndDate.value || currentPosterFilterValue) {
        loadFeed();
    }
}


/**
 * Sets the default start and end dates on the filter inputs.
 * Start date: 2 days ago.
 * End date: Today.
 */
function setDefaultDates() {
    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    // Format to YYYY-MM-DD for the input[type="date"] value
    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    feedStartDate.value = formatDate(twoDaysAgo);
    feedEndDate.value = formatDate(today);
}

// --- RUN ON PAGE LOAD AND LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDates();
    displaySkeletonLoader();
    getUniqueSenders(); 
    loadFeed();
    setInterval(checkForNewPosts, 15000); 
    
    // Custom Dropdown Listener
    posterDropdownBtn.addEventListener('click', togglePosterDropdown);
    
    // Close dropdown if user clicks outside of it
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.relative') && !posterDropdownOptions.classList.contains('hidden')) {
            posterDropdownOptions.classList.add('hidden');
            posterDropdownBtn.classList.remove('open');
        }
    });

    // Filter Listeners
    searchInput.addEventListener('input', debounce(handleFilterChange, 300));
    feedStartDate.addEventListener('change', handleFilterChange);
    feedEndDate.addEventListener('change', handleFilterChange);

    // Modal Listeners
    modalCloseBtn.addEventListener('click', closeModal);

    // Navigation Listeners
    modalPrevBtn.addEventListener('click', () => navigateToArticle(-1));
    modalNextBtn.addEventListener('click', () => navigateToArticle(1));
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault(); 
                navigateToArticle(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault(); 
                navigateToArticle(1);
            }
        }
    });

    // Indicator Listener
    newPostsIndicator.addEventListener('click', loadFeed);
});
