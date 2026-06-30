const API_BASE = '/api';

class BillageAPI {
  constructor() { this._refreshing = false; this._refreshQueue = []; }

  getAccessToken()  { return localStorage.getItem('billage_access_token'); }
  getRefreshToken() { return localStorage.getItem('billage_refresh_token'); }
  setTokens(access, refresh) {
    localStorage.setItem('billage_access_token', access);
    if (refresh) localStorage.setItem('billage_refresh_token', refresh);
  }
  clearTokens() {
    localStorage.removeItem('billage_access_token');
    localStorage.removeItem('billage_refresh_token');
    localStorage.removeItem('billage_user');
  }
  getUser()       { const u = localStorage.getItem('billage_user'); return u ? JSON.parse(u) : null; }
  setUser(user)   { localStorage.setItem('billage_user', JSON.stringify(user)); }
  isLoggedIn()    { return !!this.getAccessToken() && !!this.getUser(); }

  async _refresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!data.success) throw new Error('Refresh failed');
    this.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  async request(endpoint, options = {}) {
    const headers = { ...options.headers };
    const token = this.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (res.status === 401) {
      const data = await res.clone().json().catch(() => ({}));
      if (data.expired) {
        try {
          if (this._refreshing) {
            await new Promise(resolve => this._refreshQueue.push(resolve));
          } else {
            this._refreshing = true;
            await this._refresh();
            this._refreshing = false;
            this._refreshQueue.forEach(fn => fn());
            this._refreshQueue = [];
          }
          headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
          res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        } catch {
          this.clearTokens();
          window.location.href = '/pages/auth.html';
          throw new Error('Session expired');
        }
      }
    }

    const json = await res.json();
    if (!res.ok) throw { status: res.status, message: json.message || 'Request failed', data: json };
    return json;
  }

  get(endpoint, params)  { const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint; return this.request(url, { method: 'GET' }); }
  post(endpoint, body)   { return body instanceof FormData ? this.request(endpoint, { method: 'POST', body }) : this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
  put(endpoint, body)    { return body instanceof FormData ? this.request(endpoint, { method: 'PUT', body }) : this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
  delete(endpoint)       { return this.request(endpoint, { method: 'DELETE' }); }

  register(data)   { return this.post('/auth/register', data); }
  login(data)      { return this.post('/auth/login', data); }
  logout(rt)       { return this.post('/auth/logout', { refreshToken: rt }); }
  getMe()          { return this.get('/auth/me'); }

  getProfile(username)    { return this.get(`/users/${username}`); }
  updateProfile(fd)       { return this.put('/users/profile', fd); }
  followUser(id)          { return this.post(`/users/${id}/follow`); }
  searchUsers(q)          { return this.get('/users/search', { q }); }
  getSuggestions()        { return this.get('/users/suggestions'); }
  getFollowers(username)  { return this.get(`/users/${username}/followers`); }
  getFollowing(username)  { return this.get(`/users/${username}/following`); }

  createPost(fd)            { return this.post('/posts', fd); }
  getFeed(page = 1)         { return this.get('/posts/feed', { page, limit: 10 }); }
  getExplorePosts(page = 1) { return this.get('/posts/explore', { page, limit: 12 }); }
  getPost(id)               { return this.get(`/posts/${id}`); }
  deletePost(id)            { return this.delete(`/posts/${id}`); }
  likePost(id)              { return this.post(`/posts/${id}/like`); }
  savePost(id)              { return this.post(`/posts/${id}/save`); }
  getUserPosts(username, page = 1) { return this.get(`/posts/user/${username}`, { page, limit: 12 }); }

  getComments(postId)       { return this.get(`/posts/${postId}/comments`); }
  addComment(postId, content, parentComment) { return this.post(`/posts/${postId}/comments`, { content, parentComment }); }
  deleteComment(id)         { return this.delete(`/comments/${id}`); }
  likeComment(id)           { return this.post(`/comments/${id}/like`); }

  /* Chat API Endpoints */
  getConversations()        { return this.get('/messages/conversations'); }
  getChatHistory(userId)    { return this.get(`/messages/${userId}`); }
  sendMessage(receiverId, content) { return this.post('/messages', { receiverId, content }); }
  markChatRead(userId)      { return this.put(`/messages/${userId}/read`); }
}

const api = new BillageAPI();
window.api = api;

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideIn 0.3s reverse'; setTimeout(() => toast.remove(), 300); }, 3200);
}
window.showToast = showToast;

function getAvatarHTML(user, sizeClass = 'avatar-md') {
  if (user?.avatar) return `<img src="${user.avatar}" alt="${user.displayName || ''}" class="avatar ${sizeClass}" loading="lazy">`;
  const initials = (user?.displayName || user?.username || '?').charAt(0).toUpperCase();
  const fontSize = sizeClass.includes('xl') ? '2rem' : sizeClass.includes('lg') ? '1.5rem' : '1rem';
  return `<div class="avatar avatar-placeholder ${sizeClass}" style="font-size:${fontSize}">${initials}</div>`;
}
window.getAvatarHTML = getAvatarHTML;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
window.timeAgo = timeAgo;

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}
window.formatCount = formatCount;

function requireAuth() {
  if (!api.isLoggedIn()) { window.location.href = '/pages/auth.html'; return false; }
  return true;
}
window.requireAuth = requireAuth;