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

// --- Content Management Functions ---

/**
 * Fetches content for a given page and populates the forms.
 */
async function loadPageContent() {
    const { data, error } = await supabase
        .from('news_admin')
        .select('page, element_id, content');

    if (error) {
        console.error('Error fetching page content:', error);
        alert('Failed to load page content.');
        return;
    }

    data.forEach(item => {
        const element = document.querySelector(`[data-page="${item.page}"] [data-element-id="${item.element_id}"]`);
        if (element) {
            element.value = item.content;
        }
    });

    loadChats();
}

/**
 * Handles form submission to save content changes.
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

    // Upsert operation: insert if not exists, update if it does
    const { error } = await supabase
        .from('news_admin')
        .upsert(updates, { onConflict: 'page, element_id' });

    if (error) {
        console.error('Error saving content:', error);
        alert(`Failed to save content for ${page}: ${error.message}`);
    } else {
        alert(`${page} content saved successfully!`);
    }
}

// --- Chat Management ---

async function loadChats() {
    const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading chats:', error);
        return;
    }

    chatList.innerHTML = '';
    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = 'flex justify-between items-center p-3 bg-gray-700 rounded-md';
        chatElement.innerHTML = `
            <div>
                <p class="font-semibold">${chat.name}</p>
                <p class="text-sm text-gray-400">${chat.description}</p>
            </div>
            <div>
                <button class="edit-chat-btn px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" data-id="${chat.id}">Edit</button>
                <button class="delete-chat-btn px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700" data-id="${chat.id}">Delete</button>
            </div>
        `;
        chatList.appendChild(chatElement);
    });
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(chatForm);
    const chatData = Object.fromEntries(formData.entries());

    const { data, error } = await supabase
        .from('chats')
        .upsert(chatData)
        .select();

    if (error) {
        alert('Error saving chat: ' + error.message);
    } else {
        chatForm.reset();
        loadChats();
    }
});

chatList.addEventListener('click', async (e) => {
    if (e.target.matches('.edit-chat-btn')) {
        const id = e.target.dataset.id;
        const { data: chat, error } = await supabase
            .from('chats')
            .select('*')
            .eq('id', id)
            .single();
        if (chat) {
            document.getElementById('chat-id').value = chat.id;
            document.getElementById('chat-name').value = chat.name;
            document.getElementById('chat-description').value = chat.description;
            document.getElementById('chat-image').value = chat.image;
            document.getElementById('chat-phone').value = chat.phone;
            document.getElementById('chat-groupme').value = chat.groupme;
        }
    }

    if (e.target.matches('.delete-chat-btn')) {
        const id = e.target.dataset.id;
        if (confirm('Are you sure you want to delete this chat?')) {
            const { error } = await supabase
                .from('chats')
                .delete()
                .eq('id', id);
            if (error) {
                alert('Error deleting chat: ' + error.message);
            } else {
                loadChats();
            }
        }
    }
});


// --- Authentication Functions (Reused from admin.js) ---

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

/**
 * Checks the user's authentication state and updates UI.
 */
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        loginSection.style.display = 'none';
        adminSection.style.display = 'block';
        userEmailSpan.textContent = user.email;
        loadPageContent(); // Load content after user is verified
    } else {
        loginSection.style.display = 'block';
        adminSection.style.display = 'none';
    }
}


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', checkUser);
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
termsForm.addEventListener('submit', handleContentSave);
joinForm.addEventListener('submit', handleContentSave);
