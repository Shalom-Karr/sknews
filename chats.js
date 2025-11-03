// chats.js
import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const chatsGrid = document.getElementById('chats-grid');
    const modal = document.getElementById('chat-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalPhone = document.getElementById('modal-phone');
    const modalSmsLink = document.getElementById('modal-sms-link');
    const modalGroupmeLink = document.getElementById('modal-groupme-link');
    const closeModalBtn = document.getElementById('modal-close-btn');

    const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching chats:', error);
        chatsGrid.innerHTML = '<p>Could not load chats at this time. Please try again later.</p>';
        return;
    }

    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = 'group aspect-w-1 aspect-h-1 block rounded-lg overflow-hidden relative cursor-pointer';
        chatElement.innerHTML = `
            <img src="${chat.image}" alt="${chat.name} Chat" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
            <div class="absolute inset-0 bg-black bg-opacity-50 flex items-end p-6">
                <h3 class="text-2xl font-semibold text-white">${chat.name}</h3>
            </div>
        `;
        chatElement.addEventListener('click', () => {
            modalTitle.textContent = chat.name;
            modalDescription.textContent = chat.description;
            modalPhone.textContent = chat.phone;
            modalSmsLink.href = `sms:${chat.phone}?&body=JOIN`;
            modalGroupmeLink.href = chat.groupme;
            modal.classList.remove('hidden');
        });
        chatsGrid.appendChild(chatElement);
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});
