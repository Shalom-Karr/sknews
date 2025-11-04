// admin_new.js
import { supabase } from './supabase-client.js';

// DOM Element References
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const userEmailSpan = document.getElementById('user-email');

// Form References
const termsForm = document.getElementById('terms-form');
const joinForm = document.getElementById('join-form');
const chatForm = document.getElementById('chat-form');
const chatList = document.getElementById('chat-list');
const siteForm = document.getElementById('site-form');
const siteList = document.getElementById('site-list');

// --- Content Management Functions ---

/**
 * Fetches content for all managed sections.
 */
async function loadAllContent() {
    // Load content for Terms and Join pages
    const { data, error } = await supabase
        .from('news_admin')
        .select('page, element_id, content');

    if (error) {
        console.error('Error fetching page content:', error);
        alert('Failed to load page content.');
    } else {
        data.forEach(item => {
            const element = document.querySelector(`[data-page="${item.page}"] [data-element-id="${item.element_id}"]`);
            if (element) {
                element.value = item.content;
            }
        });
    }

    // Load dynamic data for Chats and Sites
    loadChats();
    loadSites();
}

/**
 * Handles form submission to save content changes for static pages.
 * @param {Event} event - The form submission event.
 */
async function handleContentSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const page = form.dataset.page;
    const elements = form.querySelectorAll('[data-element-id]');

    const updates = Array.from(elements).map(el => ({
        page: page,
        element_id: el.dataset.elementId,
        content: el.value
    }));

    const { error } = await supabase
        .from('news_admin')
        .upsert(updates, { onConflict: 'page, element_id' });

    if (error) {
        alert(`Failed to save content for ${page}: ${error.message}`);
    } else {
        alert(`${page} content saved successfully!`);
    }
}

// --- Chat Management ---

async function loadChats() {
    const { data: chats, error } = await supabase.from('chats').select('*').order('name');
    if (error) { console.error('Error loading chats:', error); return; }

    chatList.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-gray-700 rounded-md';
        div.innerHTML = `
            <div>
                <p class="font-semibold">${chat.name}</p>
                <p class="text-sm text-gray-400">${chat.description || ''}</p>
            </div>
            <div>
                <button class="edit-chat-btn px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" data-id="${chat.id}">Edit</button>
                <button class="delete-chat-btn px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700" data-id="${chat.id}">Delete</button>
            </div>
        `;
        chatList.appendChild(div);
    });
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(chatForm);
    const chatData = Object.fromEntries(formData.entries());
    if (!chatData.id) delete chatData.id; // Ensure ID is not sent on insert

    const { error } = await supabase.from('chats').upsert(chatData);

    if (error) {
        alert('Error saving chat: ' + error.message);
    } else {
        chatForm.reset();
        loadChats();
    }
});

chatList.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (e.target.matches('.edit-chat-btn')) {
        const { data: chat } = await supabase.from('chats').select('*').eq('id', id).single();
        if (chat) {
            document.getElementById('chat-id').value = chat.id;
            document.getElementById('chat-name').value = chat.name;
            document.getElementById('chat-description').value = chat.description;
            document.getElementById('chat-image-url').value = chat.image_url;
            document.getElementById('chat-logo-url').value = chat.logo_url;
            document.getElementById('chat-phone-number').value = chat.phone_number;
            document.getElementById('chat-groupme-link').value = chat.groupme_link;
            document.getElementById('chat-keyword').value = chat.keyword;
        }
    } else if (e.target.matches('.delete-chat-btn')) {
        if (confirm('Are you sure you want to delete this chat?')) {
            const { error } = await supabase.from('chats').delete().eq('id', id);
            if (error) alert('Error deleting chat: ' + error.message);
            else loadChats();
        }
    }
});

// --- Site Management ---

async function loadSites() {
    const { data: sites, error } = await supabase.from('sites').select('*').order('title');
    if (error) { console.error('Error loading sites:', error); return; }

    siteList.innerHTML = '';
    sites.forEach(site => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-gray-700 rounded-md';
        div.innerHTML = `
            <div>
                <p class="font-semibold">${site.title}</p>
                <p class="text-sm text-gray-400">${site.url}</p>
            </div>
            <div>
                <button class="edit-site-btn px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" data-id="${site.id}">Edit</button>
                <button class="delete-site-btn px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700" data-id="${site.id}">Delete</button>
            </div>
        `;
        siteList.appendChild(div);
    });
}

siteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(siteForm);
    const siteData = Object.fromEntries(formData.entries());
    if (!siteData.id) delete siteData.id;

    const { error } = await supabase.from('sites').upsert(siteData);

    if (error) {
        alert('Error saving site: ' + error.message);
    } else {
        siteForm.reset();
        loadSites();
    }
});

siteList.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (e.target.matches('.edit-site-btn')) {
        const { data: site } = await supabase.from('sites').select('*').eq('id', id).single();
        if (site) {
            document.getElementById('site-id').value = site.id;
            document.getElementById('site-title').value = site.title;
            document.getElementById('site-url').value = site.url;
            document.getElementById('site-description').value = site.description;
        }
    } else if (e.target.matches('.delete-site-btn')) {
        if (confirm('Are you sure you want to delete this site?')) {
            const { error } = await supabase.from('sites').delete().eq('id', id);
            if (error) alert('Error deleting site: ' + error.message);
            else loadSites();
        }
    }
});

// --- Authentication ---

async function handleLogin(event) {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.value,
        password: loginForm.password.value
    });
    if (error) alert(`Login failed: ${error.message}`);
    else loginForm.reset();
    checkUser();
}

async function handleLogout() {
    await supabase.auth.signOut();
    checkUser();
}

async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        loginSection.style.display = 'none';
        adminSection.style.display = 'block';
        userEmailSpan.textContent = user.email;
        loadAllContent();
    } else {
        loginSection.style.display = 'block';
        adminSection.style.display = 'none';
    }
}

// --- Initial Event Listeners ---

document.addEventListener('DOMContentLoaded', checkUser);
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
termsForm.addEventListener('submit', handleContentSave);
joinForm.addEventListener('submit', handleContentSave);
