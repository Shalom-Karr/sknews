// admin.js
// Handles login, logout, and adding new feed items.

import { supabase } from './supabase-client.js';

// Get references to all the important elements on the admin page
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const addFeedForm = document.getElementById('add-feed-form');
const userEmailSpan = document.getElementById('user-email');

// --- Functions ---

/**
 * Checks the current user's authentication state and updates the UI accordingly.
 */
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // If user is logged in:
        loginSection.style.display = 'none'; // Hide the login form
        adminSection.style.display = 'block'; // Show the admin content
        userEmailSpan.textContent = user.email; // Display the user's email
    } else {
        // If user is not logged in:
        loginSection.style.display = 'block'; // Show the login form
        adminSection.style.display = 'none'; // Hide the admin content
    }
}

/**
 * Handles the login form submission.
 * @param {Event} event - The form submission event.
 */
async function handleLogin(event) {
    event.preventDefault(); // Prevent the form from reloading the page
    
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert(`Login failed: ${error.message}`);
    } else {
        loginForm.reset(); // Clear the form fields
        checkUser(); // Re-check the user status to update the UI
    }
}

/**
 * Handles the logout button click.
 */
async function handleLogout() {
    await supabase.auth.signOut();
    checkUser(); // Re-check the user status to update the UI
}

/**
 * Handles the submission of the "Add Feed Item" form.
 * @param {Event} event - The form submission event.
 */
async function handleAddFeedItem(event) {
    event.preventDefault();

    const title = addFeedForm.title.value;
    const content = addFeedForm.content.value;
    const timestamp = new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
    });

    const { data, error } = await supabase
        .from('feed')
        .insert([{ title, content, timestamp }]);
    
    if (error) {
        alert(`Error adding feed item: ${error.message}`);
    } else {
        alert('Feed item added successfully!');
        addFeedForm.reset();
    }
}


// --- Event Listeners ---

// Run checkUser when the page loads to see if someone is already logged in
document.addEventListener('DOMContentLoaded', () => {
    checkUser();
});

// Attach event listeners to the forms and buttons
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
addFeedForm.addEventListener('submit', handleAddFeedItem);