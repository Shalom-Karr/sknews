import { supabase } from './supabase-client.js';

async function loadChats() {
    const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .order('id');

    if (error) {
        console.error('Error fetching chats:', error);
        const chatsGrid = document.getElementById('chats-grid');
        chatsGrid.innerHTML = `<p class="text-center text-red-400 col-span-full">Could not load chats. Please try again later.</p>`;
        return;
    }

    const chatsGrid = document.getElementById('chats-grid');
    if (chats.length === 0) {
        chatsGrid.innerHTML = `<p class="text-center text-gray-400 col-span-full">No chats to display.</p>`;
        return;
    }

    chatsGrid.innerHTML = chats.map(chat => `
        <div class="chat-item-container group cursor-pointer" data-chat='${JSON.stringify(chat)}'>
            <div class="aspect-w-1 aspect-h-1 block rounded-lg overflow-hidden relative">
                <img src="${chat.image_url}" alt="${chat.name} Chat" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
                <div class="absolute inset-0 bg-black bg-opacity-60 flex items-end p-4">
                    <h3 class="text-xl font-semibold text-white">${chat.name}</h3>
                </div>
            </div>
        </div>
    `).join('');

    setupModalTriggers();
}

function setupModalTriggers() {
    const modal = document.getElementById('chat-modal');
    const modalPanel = document.getElementById('modal-panel');
    const modalLogo = document.getElementById('modal-logo');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalPhone = document.getElementById('modal-phone');
    const modalSmsLink = document.getElementById('modal-sms-link');
    const modalGroupmeLink = document.getElementById('modal-groupme-link');
    const closeModalBtn = document.getElementById('modal-close-btn');

    document.querySelectorAll('.chat-item-container').forEach(item => {
        item.addEventListener('click', () => {
            const chat = JSON.parse(item.dataset.chat);

            modalLogo.src = chat.logo_url || 'img/default-logo.png';
            modalTitle.textContent = chat.name;
            modalDescription.textContent = chat.description;
            modalPhone.textContent = chat.phone_number;
            modalSmsLink.href = `sms:${chat.phone_number}?&body=JOIN`;
            modalGroupmeLink.href = chat.groupme_link;

            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalPanel.classList.remove('scale-95');
            }, 10);
        });
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modalPanel.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', loadChats);
