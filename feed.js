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
const sponsoredAdContainer = document.getElementById('sponsored-ad-container');
const sponsoredAdModal = document.getElementById('sponsored-ad-modal');
const sponsoredAdModalContent = document.getElementById('sponsored-ad-modal-content');
const sponsoredAdModalCloseBtn = document.getElementById('sponsored-ad-modal-close-btn');
const sponsoredAdModalTitle = document.getElementById('sponsored-ad-modal-title');


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

/**
 * Converts a YYYY-MM-DD date string into a timezone-aware ISO string for Supabase.
 * @param {string} dateString - The date in YYYY-MM-DD format.
 * @param {'start' | 'end'} position - Whether to get the start or end of the day.
 * @returns {string | null}
 */
function getEstIsoString(dateString, position = 'start') {
    if (!dateString) return null;

    // Create a date object from the input string. It will be interpreted as UTC.
    const date = new Date(`${dateString}T00:00:00Z`);

    // Get the America/New_York equivalent of this UTC date.
    const estFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    // We can use the formatted date to determine if DST is in effect.
    // This is a trick to get the correct offset.
    const estDate = new Date(estFormatter.format(date));
    const isDst = estDate.getTimezoneOffset() < new Date(date.getFullYear(), 0, 1).getTimezoneOffset();

    const offset = isDst ? '-04:00' : '-05:00';
    const time = position === 'start' ? '00:00:00' : '23:59:59';

    return `${dateString}T${time}${offset}`;
}

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
    const isPinned = item.is_pinned && new Date(item.pinned_until) > new Date();

    if (isFeatured) {
        const featuredLabel = isPinned
            ? '<div class="flex items-center text-sm font-semibold text-yellow-400 mb-3"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10.868 2.884c.321.242.593.553.794.904l.025.043a4.735 4.735 0 01.326 1.403v3.812a4.734 4.734 0 01-.326 1.403l-.025.043a2.73 2.73 0 01-.794.904l-1.01.758a.75.75 0 00-.332 1.417V17.5a.75.75 0 01-1.5 0v-5.234a.75.75 0 00-.332-1.417l-1.01-.758a2.73 2.73 0 01-.794-.904l-.025-.043a4.735 4.735 0 01-.326-1.403V5.274c0-.551.09-1.08.268-1.562l.058-.158a2.73 2.73 0 01.794-.904l1.01-.758a.75.75 0 00.332-1.417V.75a.75.75 0 011.5 0v1.717a.75.75 0 00.332 1.417l1.01.758z" clip-rule="evenodd"></path></svg>PINNED POST</div>'
            : '<div class="text-sm font-semibold text-teal-400 mb-3">LATEST UPDATE</div>';

        element.className = `group cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 border rounded-lg shadow-2xl p-6 sm:p-8 animate-on-scroll transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-teal-500/50 hover:ring-2 ${isPinned ? 'border-yellow-500/50 hover:ring-yellow-500/50' : 'border-teal-500/50 hover:ring-teal-500/50'}`;
        element.innerHTML = `${featuredLabel}<h3 class="text-3xl sm:text-4xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors">${highlightedTitle}</h3><p class="text-gray-400 leading-relaxed line-clamp-4">${highlightedContent}</p><div class="text-xs text-gray-500 mt-4">${item.sender_name || 'SK News'} | ${displayTimestamp}</div>`;
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

    modalTitle.innerHTML = highlightText(item.title, currentSearchTerm); // Use innerHTML for highlighting
    articleCounter.textContent = `Article ${index + 1} of ${totalArticles}`;

    // Highlight content before processing for display
    const highlightedContent = highlightText(item.content, currentSearchTerm);
    const contentHtml = highlightedContent.replace(/\n/g, '<p class="mt-4"></p>');

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
    const posterValue = currentPosterFilterValue;

    currentSearchTerm = searchTerm;
    filtersActive = searchTerm !== '' || startDateValue !== '' || endDateValue !== '' || posterValue !== '';

    // --- Step 1: Define queries ---
    const pinnedArticleQuery = supabase
        .from('feed')
        .select('*')
        .eq('is_pinned', true)
        .gt('pinned_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

    const latestArticleQuery = supabase
        .from('feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    let feedQuery = supabase.from('feed').select('*').order('created_at', { ascending: false });
    if (searchTerm) {
        const searchPattern = `%${searchTerm}%`;
        feedQuery = feedQuery.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);
    }
    if (posterValue) {
        feedQuery = feedQuery.eq('sender_name', posterValue);
    }
    if (startDateValue) {
        feedQuery = feedQuery.gte('created_at', getEstIsoString(startDateValue, 'start'));
    }
    if (endDateValue) {
        feedQuery = feedQuery.lte('created_at', getEstIsoString(endDateValue, 'end'));
    }

    // --- Step 2: Execute queries ---
    const [pinnedResult, latestResult, feedResult] = await Promise.all([
        pinnedArticleQuery,
        latestArticleQuery,
        feedQuery
    ]);

    // --- Step 3: Handle errors ---
    if (pinnedResult.error || latestResult.error || feedResult.error) {
        console.error('Error fetching data:', { pinnedError: pinnedResult.error, latestError: latestResult.error, feedError: feedResult.error });
        featuredContainer.innerHTML = '';
        feedContainer.innerHTML = '<p class="text-center text-red-400 md:col-span-2">Could not load the feed. Please try again.</p>';
        return;
    }

    // --- Step 4: Determine featured article and prepare grid ---
    const pinnedArticle = pinnedResult.data?.[0];
    const latestArticle = latestResult.data?.[0];
    const featuredArticle = pinnedArticle || latestArticle;

    const filteredArticles = feedResult.data || [];

    // --- Step 5: Combine data for modal navigation ---
    const finalData = [];
    const articleIds = new Set();
    if (featuredArticle) {
        finalData.push(featuredArticle);
        articleIds.add(featuredArticle.id);
    }
    filteredArticles.forEach(item => {
        if (!articleIds.has(item.id)) {
            finalData.push(item);
            articleIds.add(item.id);
        }
    });
    currentFeedData = finalData;

    // --- Step 6: Render UI ---
    featuredContainer.innerHTML = '';
    feedContainer.innerHTML = '';
    newPostsIndicator.classList.add('hidden');

    if (featuredArticle) {
        const featuredIndex = currentFeedData.findIndex(item => item.id === featuredArticle.id);
        const featuredElement = createFeedElement(featuredArticle, true, featuredIndex);
        featuredContainer.appendChild(featuredElement);
    } else {
        feedContainer.innerHTML = '<p class="text-center text-gray-400 md:col-span-2">No updates yet. Check back soon!</p>';
        return;
    }

    const gridItems = filteredArticles.filter(item => item.id !== featuredArticle.id);
    if (gridItems.length > 0) {
        gridItems.forEach(item => {
            const gridIndex = currentFeedData.findIndex(dataItem => dataItem.id === item.id);
            const feedElement = createFeedElement(item, false, gridIndex);
            feedContainer.appendChild(feedElement);
        });
    } else if (filtersActive) {
        feedContainer.innerHTML = '<p class="text-center text-gray-400 md:col-span-2">No other articles match your current filters.</p>';
    }

    // --- Step 7: Final Touches ---
    if (!filtersActive && latestArticle) {
        latestPostTimestamp = latestArticle.created_at;
    }
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
    // Get the current date in the US Eastern timezone by applying a static offset.
    // This is a simplification and doesn't account for EDT/EST shifts.
    const now = new Date();
    const estOffset = -5 * 60; // UTC-5 for EST
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const estNow = new Date(utc + (estOffset * 60000));

    const yesterday = new Date(estNow);
    yesterday.setDate(estNow.getDate() - 1);

    const tomorrow = new Date(estNow);
    tomorrow.setDate(estNow.getDate() + 1);

    // Format to YYYY-MM-DD for the input[type="date"] value
    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    feedStartDate.value = formatDate(yesterday);
    feedEndDate.value = formatDate(tomorrow);
}

// --- SPONSORED AD ---
async function loadSponsoredAd() {
    const { data, error } = await supabase
        .from('sponsored_ad')
        .select('*')
        .limit(1)
        .single();

    if (error || !data || !data.title) {
        console.error('Error fetching sponsored ad or no ad configured:', error);
        sponsoredAdContainer.innerHTML = `
            <h3 class="text-lg font-bold text-white mb-4">Sponsored</h3>
            <div class="bg-gray-700 rounded-md aspect-square flex items-center justify-center p-4">
                <div class="text-center">
                    <p class="text-gray-400 text-sm">Contact Shalom Karr to place an Ad</p>
                    <a href="tel:2164516698" class="block mt-2 text-lg font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                        216-451-6698
                    </a>
                </div>
            </div>
        `;
    } else {
        // Handle multi-line title in the ad box itself
        const adBoxTitle = data.title ? data.title.replace(/\n/g, '<br>') : '';

        sponsoredAdContainer.innerHTML = `
            <h3 class="text-lg font-bold text-white mb-4 text-center">${adBoxTitle}</h3>
            <div class="bg-gray-700 rounded-md aspect-square flex items-center justify-center p-4 cursor-pointer hover:bg-gray-600/50 transition-colors" id="sponsored-ad-box">
                <div class="text-center">
                    ${data.image_url ? `<img src="${data.image_url}" alt="${data.title}" class="max-h-32 mx-auto mb-4 rounded">` : ''}
                    <p class="text-gray-400 text-sm">${data.description || ''}</p>
                </div>
            </div>
        `;
        document.getElementById('sponsored-ad-box').addEventListener('click', (e) => {
            e.preventDefault();
            openSponsoredAdModal(data)
        });
    }
}

function openSponsoredAdModal(data) {
    // Support multi-line titles and ensure centering is handled by CSS
    sponsoredAdModalTitle.innerHTML = data.title ? data.title.replace(/\n/g, '<br>') : '';

    const buttonText = data.button_text || 'Learn More';
    // Sanitize alt text by removing newlines
    const altText = data.title ? data.title.replace(/\n/g, ' ') : '';

    // Updated image classes for full-width
    const imageHtml = data.image_url
        ? `<a href="${data.link_url}" target="_blank" rel="noopener noreferrer">
             <img src="${data.image_url}" alt="${altText}" class="w-full max-h-[70vh] object-contain mb-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
           </a>`
        : '';

    const buttonHtml = data.link_url
        ? `<a href="${data.link_url}" target="_blank" rel="noopener noreferrer" class="mt-6 inline-block px-10 py-3 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors shadow-lg">
             ${buttonText}
           </a>`
        : '';

    sponsoredAdModalContent.innerHTML = `
        ${imageHtml}
        <p class="text-gray-300 text-center px-4">${data.description || ''}</p>
        <div class="text-center w-full">
            ${buttonHtml}
        </div>
    `;

    sponsoredAdModal.classList.remove('hidden', 'modal-opening');
    sponsoredAdModal.classList.add('modal-opened');
    document.body.style.overflow = 'hidden';
}

function closeSponsoredAdModal() {
    sponsoredAdModal.classList.remove('modal-opened');
    sponsoredAdModal.classList.add('modal-opening');

    setTimeout(() => {
        sponsoredAdModal.classList.add('hidden');
        sponsoredAdModal.classList.remove('modal-opening');
        document.body.style.overflow = '';
    }, 300);
}


// --- RUN ON PAGE LOAD AND LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDates();
    displaySkeletonLoader();
    getUniqueSenders();
    loadFeed();
    loadSponsoredAd();
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
    sponsoredAdModalCloseBtn.addEventListener('click', closeSponsoredAdModal);


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
