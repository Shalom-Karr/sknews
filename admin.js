// admin.js
// Handles login, logout, viewing, adding, editing, and deleting feed items, plus filtering.

import { supabase } from './supabase-client.js';

// --- DEBOUNCE UTILITY ---
/**
 * Debounce function to limit how often a function can run.
 */
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
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const addFeedForm = document.getElementById('add-feed-form');
const userEmailSpan = document.getElementById('user-email');
const feedListSection = document.getElementById('feed-list-section');
const adminSearchInput = document.getElementById('admin-search-input'); 

// Filter elements references
const posterFilter = document.getElementById('poster-filter');
const startDateFilter = document.getElementById('start-date-filter');
const endDateFilter = document.getElementById('end-date-filter');

// Poster Management References
const addPosterForm = document.getElementById('add-poster-form');
const posterListSection = document.getElementById('poster-list-section');


// --- Utility Functions ---

function formatTimestampAdmin(isoString) {
    if (!isoString) return 'Date not available';
    const date = new Date(isoString);
    if (isNaN(date)) return 'Invalid date';
    return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function highlightText(text, term) {
    if (!term) return text;
    const highlightStyle = 'background-color: #fcd34d; color: #1f2937; padding: 2px 0; border-radius: 2px;';
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, `<span style="${highlightStyle}">$1</span>`);
}


// --- POSTER CONFIGURATION FUNCTIONS ---

/**
 * Fetches and renders the list of posters for management.
 */
async function loadPosterConfig() {
    posterListSection.innerHTML = '<p class="loading-message">Loading poster list...</p>';
    
    const { data: posters, error } = await supabase
        .from('poster_config')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) {
        console.error('Error fetching poster config:', error);
        posterListSection.innerHTML = '<p class="loading-message text-red-400">Error loading poster list.</p>';
        return;
    }

    posterListSection.innerHTML = '';
    posters.forEach(poster => {
        posterListSection.appendChild(createPosterElement(poster));
    });
    
    // After loading config, update the filter dropdown list
    updatePosterFilterDropdown(posters);
}

/**
 * Creates the DOM element for managing a single poster.
 */
function createPosterElement(poster) {
    const element = document.createElement('div');
    element.className = 'flex justify-between items-center p-3 bg-gray-700 rounded-md';
    element.innerHTML = `
        <div class="flex items-center space-x-4 flex-grow">
            <span class="text-sm font-medium text-gray-400">Order:</span>
            <input type="number" data-id="${poster.id}" data-field="order" value="${poster.display_order}" 
                   class="w-16 px-2 py-1 bg-gray-600 rounded text-white text-center text-sm focus:border-teal-400">
            
            <span class="text-sm font-semibold text-white flex-grow">${poster.sender_name}</span>
        </div>
        <button data-id="${poster.id}" data-name="${poster.sender_name}" data-action="delete-poster" 
                class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">Delete</button>
    `;

    // Attach listeners for inline editing and deletion
    element.querySelector('input[data-field="order"]').addEventListener('change', (e) => updatePosterOrder(poster.id, parseInt(e.target.value)));
    element.querySelector('[data-action="delete-poster"]').addEventListener('click', handleDeletePoster);

    return element;
}

/**
 * Updates the display order of a single poster config item.
 */
async function updatePosterOrder(posterId, newOrder) {
    const { error } = await supabase
        .from('poster_config')
        .update({ display_order: newOrder })
        .eq('id', posterId);

    if (error) {
        alert(`Error updating order: ${error.message}`);
    } else {
        // Reload list to reflect the new order immediately
        loadPosterConfig();
        applyFilters(); 
    }
}

/**
 * Handles adding a new poster configuration.
 */
async function handleAddPoster(event) {
    event.preventDefault();
    const nameInput = document.getElementById('new-poster-name');
    const orderInput = document.getElementById('new-poster-order');

    const name = nameInput.value.trim();
    const order = parseInt(orderInput.value);

    if (!name || isNaN(order)) {
        alert("Please provide a name and a valid display order.");
        return;
    }

    const { error } = await supabase
        .from('poster_config')
        .insert([{ sender_name: name, display_order: order }]);

    if (error) {
        alert(`Error adding poster: ${error.message}`);
    } else {
        nameInput.value = '';
        orderInput.value = '';
        loadPosterConfig();
        applyFilters(); 
    }
}

/**
 * Handles deleting a poster configuration.
 */
async function handleDeletePoster(event) {
    const posterId = event.currentTarget.dataset.id;
    const posterName = event.currentTarget.dataset.name;

    if (!confirm(`Are you sure you want to delete the poster configuration for "${posterName}"? This does NOT delete feed items.`)) {
        return;
    }

    const { error } = await supabase
        .from('poster_config')
        .delete()
        .eq('id', posterId);

    if (error) {
        alert(`Error deleting poster: ${error.message}`);
    } else {
        alert('Poster configuration deleted.');
        loadPosterConfig();
        applyFilters(); 
    }
}

/**
 * Populates the Poster Filter Dropdown based on the live config list.
 */
function updatePosterFilterDropdown(posters) {
    posterFilter.innerHTML = '<option value="">All Posters</option>';
    posters.forEach(poster => {
        const option = document.createElement('option');
        option.value = poster.sender_name;
        option.textContent = poster.sender_name;
        posterFilter.appendChild(option);
    });
}


// --- FEED ITEM MANAGEMENT FUNCTIONS ---

/**
 * Renders the existing feed items in the admin panel with multiple filter options.
 */
async function loadFeedItems(searchTerm = '', posterFilterValue = '', startDateValue = '', endDateValue = '') {
    feedListSection.innerHTML = '<p class="loading-message">Loading articles...</p>';

    let query = supabase
        .from('feed')
        .select('id, title, content, created_at, sender_name')
        .order('created_at', { ascending: false });
    
    // 1. Apply Search Filter (Title or Content)
    if (searchTerm) {
        const searchPattern = `%${searchTerm}%`;
        query = query.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);
    }

    // 2. Apply Poster Filter (Sender Name)
    if (posterFilterValue) {
        query = query.eq('sender_name', posterFilterValue);
    }
    
    // 3. Apply Date Range Filters
    if (startDateValue) {
        query = query.gte('created_at', startDateValue);
    }
    
    if (endDateValue) {
        query = query.lte('created_at', endDateValue + 'T23:59:59'); 
    }

    const { data: items, error } = await query;

    if (error) {
        console.error('Error fetching admin feed:', error);
        feedListSection.innerHTML = '<p class="loading-message text-red-400">Error loading feed items.</p>';
        return;
    }

    if (items.length === 0) {
        feedListSection.innerHTML = `<p class="loading-message">No items found matching your filters.</p>`;
        return;
    }

    feedListSection.innerHTML = ''; 

    const currentSearchTerm = adminSearchInput.value.trim(); 

    items.forEach(item => {
        const itemElement = createFeedItemElement(item, currentSearchTerm);
        feedListSection.appendChild(itemElement);
    });
}

/**
 * Creates the HTML element for a single feed item with controls.
 */
function createFeedItemElement(item, searchTerm) {
    const element = document.createElement('div');
    element.id = `item-${item.id}`;
    element.className = 'p-4 border border-gray-700 rounded-md bg-gray-700/50 transition-shadow duration-200 hover:shadow-lg hover:shadow-teal-500/10';
    
    const highlightedTitle = highlightText(item.title, searchTerm);
    const highlightedContent = highlightText(item.content, searchTerm);

    element.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-grow">
                <h4 class="text-xl font-semibold text-white mb-2" data-field="title">${highlightedTitle}</h4>
                <p class="text-sm text-gray-400 mb-3">
                    <span class="text-teal-400">${item.sender_name || 'System/Manual'}</span> | 
                    ${formatTimestampAdmin(item.created_at)}
                </p>
                <div class="text-gray-300 whitespace-pre-wrap mb-4" data-field="content">${highlightedContent}</div>
            </div>
            <div class="flex flex-shrink-0 space-x-2 mt-1">
                <button data-id="${item.id}" data-action="edit" class="btn-control bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors">Edit</button>
                <button data-id="${item.id}" data-action="delete" class="btn-control bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors">Delete</button>
            </div>
        </div>
    `;

    element.querySelector('[data-action="edit"]').addEventListener('click', (e) => handleEdit(item.id, element));
    element.querySelector('[data-action="delete"]').addEventListener('click', (e) => handleDelete(item.id));

    return element;
}


// Handler that combines all filters and uses current values
function applyFilters() {
    const searchTerm = adminSearchInput.value.trim();
    const posterValue = posterFilter.value;
    const startDateValue = startDateFilter.value;
    const endDateValue = endDateFilter.value;
    loadFeedItems(searchTerm, posterValue, startDateValue, endDateValue);
}


async function handleEdit(itemId, itemElement) {
    const titleElement = itemElement.querySelector('[data-field="title"]');
    const contentElement = itemElement.querySelector('[data-field="content"]');
    const controlsContainer = itemElement.querySelector('.flex-shrink-0');
    
    const titleText = titleElement.textContent;
    const contentText = contentElement.textContent;

    // Replace elements with editable inputs
    titleElement.outerHTML = `<input type="text" value="${titleText}" class="w-full px-2 py-1 bg-gray-600 border border-teal-500 rounded-md text-white mb-2 text-xl font-semibold" id="edit-title-${itemId}">`;
    contentElement.outerHTML = `<textarea rows="4" class="w-full px-2 py-1 bg-gray-600 border border-teal-500 rounded-md text-white mb-4" id="edit-content-${itemId}">${contentText}</textarea>`;

    controlsContainer.innerHTML = `
        <button data-action="save" data-id="${itemId}" class="btn-control bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors">Save</button>
        <button data-action="cancel" data-id="${itemId}" class="btn-control bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors">Cancel</button>
    `;

    controlsContainer.querySelector('[data-action="save"]').addEventListener('click', () => handleSave(itemId));
    controlsContainer.querySelector('[data-action="cancel"]').addEventListener('click', applyFilters); 
}

async function handleSave(itemId) {
    const newTitle = document.getElementById(`edit-title-${itemId}`).value;
    const newContent = document.getElementById(`edit-content-${itemId}`).value;

    if (!newTitle || !newContent) {
        alert('Title and Content cannot be empty.');
        return;
    }

    const { error } = await supabase
        .from('feed')
        .update({ title: newTitle, content: newContent })
        .eq('id', itemId);

    if (error) {
        alert(`Error updating item: ${error.message}`);
    } else {
        alert('Item updated successfully!');
        applyFilters(); 
    }
}

async function handleDelete(itemId) {
    if (!confirm('Are you sure you want to delete this feed item? This cannot be undone.')) {
        return;
    }

    const { error } = await supabase
        .from('feed')
        .delete()
        .eq('id', itemId);

    if (error) {
        alert(`Error deleting item: ${error.message}`);
    } else {
        alert('Item deleted successfully!');
        applyFilters(); 
    }
}

async function handleLogin(event) {
    event.preventDefault(); 
    
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert(`Login failed: ${error.message}`);
    } else {
        loginForm.reset(); 
        checkUser(); 
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    checkUser(); 
}

async function handleAddFeedItem(event) {
    event.preventDefault();

    const title = addFeedForm.title.value;
    const content = addFeedForm.content.value;

    const { data: { user } } = await supabase.auth.getUser();
    const senderName = user ? `Admin` : 'Admin';
    
    const { error } = await supabase
        .from('feed')
        .insert([{ title, content, sender_name: senderName }]);
    
    if (error) {
        alert(`Error adding feed item: ${error.message}`);
    } else {
        alert('Feed item added successfully!');
        addFeedForm.reset();
        loadPosterConfig(); // Reload config in case a new sender name was added
        loadFeedItems(); 
    }
}

/**
 * Checks the current user's authentication state and updates the UI accordingly.
 */
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        loginSection.style.display = 'none'; 
        adminSection.style.display = 'block'; 
        userEmailSpan.textContent = user.email; 
        
        await loadPosterConfig(); 
        loadFeedItems(); 
    } else {
        loginSection.style.display = 'block'; 
        adminSection.style.display = 'none'; 
        feedListSection.innerHTML = '<p class="loading-message">Please log in to manage items.</p>';
    }
}


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', checkUser);

loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
addFeedForm.addEventListener('submit', handleAddFeedItem);
addPosterForm.addEventListener('submit', handleAddPoster); 

// Filter Listeners (using debounced search)
adminSearchInput.addEventListener('input', debounce(() => {
    const term = adminSearchInput.value.trim();
    if (term.length >= 3 || term.length === 0) {
        applyFilters();
    }
}, 300));

posterFilter.addEventListener('change', applyFilters);
startDateFilter.addEventListener('change', applyFilters);
endDateFilter.addEventListener('change', applyFilters);
