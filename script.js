let books = [];
let currentUser = null;
let isSignUpMode = false;

// Индивидуальные данные текущего сеанса
let userData = {
    favorites: [],
    openedBooks: []
};

const CHARS_PER_PAGE = 1400;
let currentPage = 0;
let bookPages = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Ошибка загрузки данных книг');
        books = await response.json();

        checkUserSession();
        updateUI();
        initSearch();
    } catch (error) {
        console.error("Книги не загружены:", error);
    }
});

// --- Система сессий ---

function checkUserSession() {
    const sessionUser = localStorage.getItem('kitaphub_current_user');
    if (sessionUser) {
        currentUser = sessionUser;
        const storedData = localStorage.getItem(`kitaphub_user_${currentUser}`);
        if (storedData) {
            userData = JSON.parse(storedData);
        } else {
            userData = { favorites: [], openedBooks: [] };
        }
    } else {
        currentUser = null;
        userData = { favorites: [], openedBooks: [] };
    }
    updateProfileMenuDOM();
}

function updateProfileMenuDOM() {
    const avatar = document.getElementById('userAvatar');
    const btnText = document.getElementById('profileBtnText');
    const authBlock = document.getElementById('profileAuthorized');
    const guestBlock = document.getElementById('profileGuest');

    if (currentUser) {
        avatar.innerText = currentUser.substring(0, 2).toUpperCase();
        avatar.style.background = "#16a34a"; // Зеленый для авторизованных
        btnText.innerText = currentUser;

        if(authBlock) authBlock.classList.remove('hidden');
        if(guestBlock) guestBlock.classList.add('hidden');

        document.getElementById('welcomeUser').innerText = `Сәлем, ${currentUser}!`;
        document.getElementById('statFavCount').innerText = userData.favorites.length;
        document.getElementById('statOpenedCount').innerText = userData.openedBooks.length;
    } else {
        avatar.innerText = "?";
        avatar.style.background = "#2563eb"; // Синий для гостей
        btnText.innerText = "Кіру";

        if(authBlock) authBlock.classList.add('hidden');
        if(guestBlock) guestBlock.classList.remove('hidden');
    }
}

function saveUserData() {
    if (currentUser) {
        localStorage.setItem(`kitaphub_user_${currentUser}`, JSON.stringify(userData));
        updateProfileMenuDOM();
    }
}

// --- Логика модалки логина ---

function openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('profileMenu').classList.add('hidden');
    isSignUpMode = false;
    updateAuthModalDOM();
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authForm').reset();
    document.getElementById('authError').classList.add('hidden');
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    updateAuthModalDOM();
}

function updateAuthModalDOM() {
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleBtn = document.getElementById('authToggleModeBtn');
    document.getElementById('authError').classList.add('hidden');

    if (isSignUpMode) {
        title.innerText = "Тіркелу";
        submitBtn.innerText = "Тіркелу";
        toggleBtn.innerText = "Аккаунт бар ма? Кіру";
    } else {
        title.innerText = "Жүйеге кіру";
        submitBtn.innerText = "Кіру";
        toggleBtn.innerText = "Аккаунт жоқ па? Тіркелу";
    }
}

function handleAuth(event) {
    event.preventDefault();
    const loginInput = document.getElementById('authLogin').value.trim();
    const passwordInput = document.getElementById('authPassword').value;
    const errorBlock = document.getElementById('authError');

    if (!loginInput || !passwordInput) return;

    let users = JSON.parse(localStorage.getItem('kitaphub_users_list')) || {};

    if (isSignUpMode) {
        if (users[loginInput]) {
            errorBlock.innerText = "Бұл логин бос емес!";
            errorBlock.classList.remove('hidden');
            return;
        }
        users[loginInput] = passwordInput;
        localStorage.setItem('kitaphub_users_list', JSON.stringify(users));
        logInUser(loginInput);
    } else {
        if (!users[loginInput] || users[loginInput] !== passwordInput) {
            errorBlock.innerText = "Логин немесе құпия сөз қате!";
            errorBlock.classList.remove('hidden');
            return;
        }
        logInUser(loginInput);
    }
}

function logInUser(username) {
    localStorage.setItem('kitaphub_current_user', username);
    closeAuthModal();
    checkUserSession();
    updateUI();
}

function logout() {
    localStorage.removeItem('kitaphub_current_user');
    checkUserSession();
    updateUI();
    document.getElementById('profileMenu').classList.add('hidden');
}

// --- Чтение и статистика кликов ---

async function openRead(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;

    // Счётчик уникальных открытий для статистики ЛК
    if (currentUser) {
        if (!userData.openedBooks.includes(id)) {
            userData.openedBooks.push(id);
            saveUserData();
        }
    }

    const modal = document.getElementById('readModal');
    const contentArea = document.getElementById('readContent');

    document.getElementById('readTitle').innerText = book.title;
    contentArea.innerHTML = '<div class="text-white opacity-50 text-center py-20">Жүктелуде...</div>';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        let fullText = '';

        if (book.text && book.text.trim().length > 0) {
            fullText = book.text;
        } else {
            const response = await fetch(`texts/${id}.txt`);
            if (!response.ok) throw new Error();
            fullText = await response.text();
        }
        bookPages = [];
        for (let i = 0; i < fullText.length; i += CHARS_PER_PAGE) {
            bookPages.push(fullText.substring(i, i + CHARS_PER_PAGE));
        }
        if (bookPages.length === 0) bookPages.push("Мәтін бос.");

        currentPage = 0;
        renderBookPage();
    } catch (e) {
        contentArea.innerHTML = `
            <div class="text-red-400 text-center py-20 font-bold uppercase tracking-widest">
                Мәтін табылмады.<br>
                <span class="text-[10px] opacity-50 block mt-2">texts/${id}.txt файлын тексеріңіз</span>
            </div>`;
    }
}

function renderBookPage() {
    const contentArea = document.getElementById('readContent');
    const pageInfo = document.getElementById('pageIndicator');
    contentArea.innerHTML = `<div class="animate-fade text-slate-300 leading-relaxed text-lg text-justify font-light">${bookPages[currentPage]}</div>`;
    if (pageInfo) {
        pageInfo.innerText = `Бет ${currentPage + 1} / ${bookPages.length}`;
    }
    contentArea.scrollTop = 0;
}

function nextPage() { if (currentPage < bookPages.length - 1) { currentPage++; renderBookPage(); } }
function prevPage() { if (currentPage > 0) { currentPage--; renderBookPage(); } }
function closeRead() { document.getElementById('readModal').classList.add('hidden'); document.body.style.overflow = 'auto'; }

// --- Рендеринг интерфейса ---

function updateUI(filteredBooks = books) {
    const mainGrid = document.getElementById('bookGrid');
    if (mainGrid) {
        if (filteredBooks.length === 0) {
            mainGrid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-10">Кітап табылмады</div>`;
        } else {
            mainGrid.innerHTML = filteredBooks.map(b => createCardHTML(b)).join('');
        }
    }
    renderFavorites();
}

function createCardHTML(b) {
    const progress = Math.floor(((b.id * 17) % 85) + 5);
    const isFav = userData.favorites.includes(b.id) ? 'active' : '';

    return `
    <div class="book-card animate-fade">
        <button class="favorite-btn ${isFav}" onclick="toggleFavorite(${b.id})">
            <i class="fas fa-heart"></i>
        </button>
        <div class="book-img-container shadow-2xl mb-6">
            <img src="${b.img}" loading="lazy" onerror="this.src='https://placehold.co/400x600/1e293b/white?text=НЕТ+ФОТО'">
        </div>
        <div class="flex-1">
            <span class="text-[10px] font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full uppercase mb-3 inline-block">${b.cat}</span>
            <h3 class="truncate text-white text-lg font-bold mb-1" title="${b.title}">${b.title}</h3>
            <p class="text-slate-500 text-[11px] font-bold mb-4 uppercase tracking-tighter">${b.author}</p>
        </div>
        <div class="mb-4">
            <div class="flex justify-between items-center mb-1.5">
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Прогресс</span>
                <span class="text-[9px] font-black text-blue-500">${progress}%</span>
            </div>
            <div class="card-progress"><div class="progress-fill" style="width: ${progress}%"></div></div>
        </div>
        <button onclick="openRead(${b.id})" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-blue-700 transition transform active:scale-95 shadow-lg uppercase">Оқу</button>
    </div>`;
}

// --- Кнопка Тандаулар ---

function toggleFavorite(id) {
    if (!currentUser) {
        openAuthModal();
        return;
    }

    if (userData.favorites.includes(id)) {
        userData.favorites = userData.favorites.filter(favId => favId !== id);
    } else {
        userData.favorites.push(id);
    }

    saveUserData();

    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filtered = books.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));

    updateUI(filtered);
}

function renderFavorites() {
    const favSection = document.getElementById('favorites-section');
    const favGrid = document.getElementById('favoritesGrid');

    if (!favSection || !favGrid) return;

    const favoriteBooks = books.filter(b => userData.favorites.includes(b.id));

    if (favoriteBooks.length === 0) {
        favSection.classList.add('hidden');
    } else {
        favSection.classList.remove('hidden');
        favGrid.innerHTML = favoriteBooks.map(b => createCardHTML(b)).join('');
    }
}

// --- Поиск ---

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = books.filter(b =>
            b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query)
        );
        updateUI(filtered);
    });
}

// --- Меню профиля ---

function toggleProfile() {
    const profileMenu = document.getElementById('profileMenu');
    if (profileMenu) profileMenu.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const profileMenu = document.getElementById('profileMenu');
    const profileBtn = e.target.closest('#profileBtn');

    if (profileMenu && !profileMenu.classList.contains('hidden') && !profileBtn && !e.target.closest('#profileMenu')) {
        profileMenu.classList.add('hidden');
    }
});