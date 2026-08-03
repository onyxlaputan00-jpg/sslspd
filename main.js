function switchAdminTab(tabName) {
    const rosterPanel = document.getElementById('admin-panel-roster');
    const newsPanel = document.getElementById('admin-panel-news');
    const usersPanel = document.getElementById('admin-panel-users');
    const rosterTab = document.getElementById('tab-roster');
    const newsTab = document.getElementById('tab-news');
    const usersTab = document.getElementById('tab-users');
    
    rosterPanel.classList.add('hidden');
    newsPanel.classList.add('hidden');
    usersPanel.classList.add('hidden');
    rosterTab.classList.add('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
    rosterTab.classList.remove('bg-nbiGold', 'text-nbiBlue');
    newsTab.classList.add('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
    newsTab.classList.remove('bg-nbiGold', 'text-nbiBlue');
    usersTab.classList.add('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
    usersTab.classList.remove('bg-nbiGold', 'text-nbiBlue');
    
    if (tabName === 'roster') {
        rosterPanel.classList.remove('hidden');
        rosterTab.classList.remove('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
        rosterTab.classList.add('bg-nbiGold', 'text-nbiBlue');
    } else if (tabName === 'news') {
        newsPanel.classList.remove('hidden');
        newsTab.classList.remove('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
        newsTab.classList.add('bg-nbiGold', 'text-nbiBlue');
    } else if (tabName === 'users') {
        usersPanel.classList.remove('hidden');
        usersTab.classList.remove('bg-slate-700', 'hover:bg-slate-600', 'text-slate-300');
        usersTab.classList.add('bg-nbiGold', 'text-nbiBlue');
        loadAdminUsers();
    }
}

function navigateTo(targetPageId) {
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => { page.classList.add('hidden'); });
    const selectedPage = document.getElementById(`page-${targetPageId}`);
    if (selectedPage) selectedPage.classList.remove('hidden');
    const navButtons = document.querySelectorAll('nav button');
    navButtons.forEach(button => {
        button.classList.remove('text-nbiGold', 'bg-slate-800/60', 'border', 'border-nbiGold/30');
        button.classList.add('text-slate-300', 'hover:text-white', 'hover:bg-slate-800/40');
    });
    const activeButton = document.getElementById(`nav-${targetPageId}`);
    if (activeButton) {
        activeButton.classList.remove('text-slate-300', 'hover:text-white', 'hover:bg-slate-800/40');
        activeButton.classList.add('text-nbiGold', 'bg-slate-800/60', 'border', 'border-nbiGold/30');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

let supabaseClient = null;
let isSupabaseReady = false;

async function initSupabase() {
    try {
        const config = window.__ENV__ || {};

        if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
            throw new Error('Missing Supabase config. Set SUPABASE_URL and SUPABASE_KEY in Vercel.');
        }

        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        isSupabaseReady = true;

        console.log('Supabase READY');

        loadLiveRoster();
        loadNews();
        monitorAuthState();
        loadPublicNews();

    } catch (err) {
        console.error('Supabase init failed:', err);
    }
}

async function loadPublicNews() {
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('news').select('*').order('created_at', { ascending: false }).limit(5);
    if (!data || typeof document === 'undefined') return;
    const container = document.getElementById('news-feed');
    if (!container) return;
    container.innerHTML = data.map(post => `
        <div class="bg-nbiSlate p-4 rounded border border-slate-800">
            <h3 class="text-white font-bold cursor-pointer" onclick="showNews(${post.id})">${post.title}</h3>
            <p class="text-slate-400 text-sm">${(post.content && post.content.length > 160) ? post.content.slice(0,160) + '…' : (post.content || '')}</p>
        </div>
    `).join('');
}

async function showNews(id) {
    if (!supabaseClient) return;
    const modal = document.getElementById('news-modal');
    const titleEl = document.getElementById('news-modal-title');
    const dateEl = document.getElementById('news-modal-date');
    const bodyEl = document.getElementById('news-modal-body');
    try {
        const { data, error } = await supabaseClient.from('news').select('*').eq('id', id).limit(1).single();
        if (error) throw error;
        if (!data) return alert('Article not found');
        titleEl.textContent = data.title || '';
        dateEl.textContent = data.created_at ? new Date(data.created_at).toLocaleString() : '';
        bodyEl.textContent = data.content || '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } catch (err) {
        alert(err.message || 'Failed to load article');
    }
}

function closeNews() {
    const modal = document.getElementById('news-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('news-modal-close');
    const modal = document.getElementById('news-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeNews);
    if (modal) modal.addEventListener('click', (e) => { if (e.target && e.target.id === 'news-modal') closeNews(); });
    initSupabase();
});

async function loadNews() {
    if (!supabaseClient) return;
    const { data: news, error } = await supabaseClient.from('news').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    if (typeof document === 'undefined') return;
    const container = document.getElementById('admin-news-table');
    if (!container) return;
    container.innerHTML = '';
    news.forEach(post => {
        container.innerHTML += `
            <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                <td class="p-2 text-white font-bold truncate">${post.title}</td>
                <td class="p-2 text-xs text-slate-500">${new Date(post.created_at).toLocaleDateString()}</td>
                <td class="p-2 flex space-x-2">
                    <button onclick="editNews(${post.id})" class="text-nbiGold text-xs uppercase font-bold hover:text-yellow-400">Edit</button>
                    <button onclick="deleteNews(${post.id})" class="text-red-400 text-xs uppercase font-bold hover:text-red-300">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function editNews(id) {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('news').select('*').eq('id', id).limit(1).single();
    if (error) return alert(error.message || 'Failed to fetch news');
    if (!data) return alert('News item not found');
    const titleEl = document.getElementById('news-title');
    const contentEl = document.getElementById('news-content');
    const idEl = document.getElementById('news-id');
    const submitBtn = document.getElementById('news-submit-btn');
    if (titleEl) titleEl.value = data.title || '';
    if (contentEl) contentEl.value = data.content || '';
    if (idEl) idEl.value = data.id || '';
    if (submitBtn) submitBtn.textContent = 'Update News';
}

async function loadLiveRoster() {
    if (!supabaseClient) return;
    const { data: agents, error } = await supabaseClient.from('roster').select('*').order('id', { ascending: true });
    if (error) return console.error(error);
    if (typeof document === 'undefined') return;
    const publicGrid = document.getElementById('live-roster-grid');
    const adminTable = document.getElementById('admin-table-body');
    if (!publicGrid || !adminTable) return;
    publicGrid.innerHTML = '';
    adminTable.innerHTML = '';
    agents.forEach(agent => {
        const isDirector = agent.division === 'Directorate';
        const borderStyle = isDirector ? 'border-nbiGold' : 'border-slate-500';
        const tagStyle = isDirector ? 'bg-nbiGold/10 text-nbiGold' : 'bg-slate-700 text-slate-300';
        const finalAvatar = agent.avatar_url || 'https://i.imgur.com/He9gYnm.png';
        publicGrid.innerHTML += `
            <div class="bg-nbiSlate/50 rounded-xl border-t-2 ${borderStyle} p-6 flex flex-col items-center text-center shadow-lg transform transition duration-300 hover:scale-[1.02]">
                <span class="text-[10px] uppercase font-mono ${tagStyle} px-2 py-0.5 rounded font-bold self-center mb-4">${agent.division}</span>
                <div class="w-24 h-24 mb-4 rounded-full border-2 ${isDirector ? 'border-nbiGold' : 'border-slate-600'} overflow-hidden bg-slate-900 flex items-center justify-center shadow-inner">
                    <img src="${finalAvatar}" alt="Agent Profile" class="w-full h-full object-cover">
                </div>

                <h3 class="font-bold text-xl text-white tracking-wide">${agent.agent_name}</h3>
                <p class="text-xs text-slate-400 mt-1">${agent.agent_rank}</p>
            </div>
        `;
        adminTable.innerHTML += `
        <tr class="border-b border-slate-800 hover:bg-slate-800/30">
            <td class="p-3 font-semibold text-white flex items-center space-x-3">
                <img src="${finalAvatar}" class="w-6 h-6 rounded-full object-cover">
                <span>${agent.agent_name}</span>
            </td>
            <td class="p-3 text-xs text-slate-400">${agent.agent_rank} (${agent.division})</td>
            <td class="p-3">
                <button onclick="deleteAgent(${agent.id})" class="text-red-400 hover:text-red-500 text-xs uppercase font-mono font-bold">Revoke Access</button>
            </td>
        </tr>
    `;
    });
}

async function monitorAuthState() {
    if (!supabaseClient || typeof supabaseClient.auth === 'undefined') return;
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (typeof document === 'undefined') return;
        const loginBox = document.getElementById('admin-login-box');
        const controlDashboard = document.getElementById('admin-control-dashboard');
        if (!loginBox || !controlDashboard) return;
        if (session) {
            loginBox.classList.add('hidden');
            controlDashboard.classList.remove('hidden');
            await updateAdminPanelForRole();
        } else {
            loginBox.classList.remove('hidden');
            controlDashboard.classList.add('hidden');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabaseClient) return;
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) alert(error.message);
        });
    }
});

async function deleteNews(id) {
    if (typeof window === 'undefined' || !confirm('Delete this news post?')) return;
    const { error } = await supabaseClient.from('news').delete().eq('id', id);
    if (error) alert(error.message);
    else loadNews();
}

async function deleteAgent(id) {
    if (typeof window === 'undefined' || !confirm('Are you certain you wish to purge this agent profile from the record banks permanently?')) return;
    const { error } = await supabaseClient.from('roster').delete().eq('id', id);
    if (error) alert(error.message);
    else loadLiveRoster();
}

async function handleLogout() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
}

async function getCurrentUserRole() {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) return null;
    const user = data.user;
    const { data: adminRecord, error: adminError } = await supabaseClient.from('admin_users').select('role').eq('email', user.email).single();
    if (adminError) return null;
    return adminRecord?.role || null;
}

async function loadAdminUsers() {
    if (!supabaseClient) return;
    const { data: users, error } = await supabaseClient.from('admin_users').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    if (typeof document === 'undefined') return;
    const container = document.getElementById('admin-users-table');
    if (!container) return;
    container.innerHTML = '';
    if (!users || users.length === 0) {
        container.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-500">No news editors yet</td></tr>';
        return;
    }
    users.forEach(user => {
        const roleLabel = user.role === 'full' ? '👑 Full Admin' : '📝 News Editor';
        container.innerHTML += `
            <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                <td class="p-2 text-white font-mono text-sm truncate">${user.email}</td>
                <td class="p-2 text-xs text-slate-400">${roleLabel}</td>
                <td class="p-2">
                    <button onclick="deleteAdminUser(${user.id})" class="text-red-400 text-xs uppercase font-bold hover:text-red-300">Remove</button>
                </td>
            </tr>
        `;
    });
}

async function addAdminUser(email, password) {
    alert('User creation is disabled in this deployment mode. Use the Supabase dashboard to add new admin users.');
}

async function deleteAdminUser(id) {
    if (typeof window === 'undefined' || !confirm('Remove this news editor?')) return;
    const { error } = await supabaseClient.from('admin_users').delete().eq('id', id);
    if (error) alert(error.message);
    else loadAdminUsers();
}

async function updateAdminPanelForRole() {
    const role = await getCurrentUserRole();
    if (typeof document === 'undefined') return;
    const rosterTab = document.getElementById('tab-roster');
    const usersTab = document.getElementById('tab-users');
    if (role === 'news_only') {
        if (rosterTab) rosterTab.style.display = 'none';
        if (usersTab) usersTab.style.display = 'none';
        switchAdminTab('news');
    }
}

const addUserForm = document.getElementById('add-user-form');
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('new-user-email');
        const passwordEl = document.getElementById('new-user-password');
        const email = emailEl ? emailEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value.trim() : '';
        if (!email || !password) return alert('Please enter email and password.');
        if (password.length < 8) return alert('Password must be at least 8 characters.');
        await addAdminUser(email, password);
    });
}

const addAgentForm = document.getElementById('add-agent-form');
if (addAgentForm) {
    addAgentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-agent-name').value;
        const rank = document.getElementById('new-agent-rank').value;
        const division = document.getElementById('new-agent-division').value;
        const avatarEl = document.getElementById('new-agent-avatar');
        const avatar = avatarEl ? avatarEl.value.trim() : '';
        const payload = { agent_name: name, agent_rank: rank, division };
        if (avatar) payload.avatar_url = avatar;
        const { error } = await supabaseClient.from('roster').insert([payload]);
        if (error) {
            alert(`Database Entry Failed: ${error.message}`);
        } else {
            addAgentForm.reset();
            loadLiveRoster();
        }
    });
}

const addNewsForm = document.getElementById('add-news-form');
if (addNewsForm) {
    addNewsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleEl = document.getElementById('news-title');
        const contentEl = document.getElementById('news-content');
        const idEl = document.getElementById('news-id');
        const submitBtn = document.getElementById('news-submit-btn');
        const title = titleEl ? titleEl.value.trim() : '';
        const content = contentEl ? contentEl.value.trim() : '';
        if (!title || !content) return alert('Please enter title and content.');
        try {
            if (idEl && idEl.value) {
                const id = idEl.value;
                const { error } = await supabaseClient.from('news').update({ title, content }).eq('id', id);
                if (error) return alert(`Update failed: ${error.message}`);
            } else {
                const { error } = await supabaseClient.from('news').insert([{ title, content }]);
                if (error) return alert(`Publish failed: ${error.message}`);
            }
            addNewsForm.reset();
            if (idEl) idEl.value = '';
            if (submitBtn) submitBtn.textContent = 'Publish News';
            loadNews();
            loadPublicNews();
        } catch (err) {
            alert(err.message || 'An error occurred');
        }
    });
}
