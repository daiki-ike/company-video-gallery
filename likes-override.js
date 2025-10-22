// Override like storage to use server-side API (PHP or Cloudflare Workers)
// This file is loaded AFTER script.js and replaces certain functions.

// Allow overriding endpoint via window.LIKES_API_URL (set in likes-config.js).
const LIKES_API_URL = (typeof window !== 'undefined' && window.LIKES_API_URL)
  ? window.LIKES_API_URL
  : 'likes.php';

async function saveLike(videoUrl) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined' && window.ADMIN_TOKEN) {
      headers['X-Admin-Token'] = window.ADMIN_TOKEN;
    }
    const res = await fetch(LIKES_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'like', url: videoUrl })
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const newCount = data.count || 0;
    if (typeof likesCache === 'object') {
      likesCache[videoUrl] = newCount;
    }
    console.log('✅ いいねデータを保存しました');
    return newCount;
  } catch (error) {
    console.error('いいねの保存に失敗しました:', error);
    if (typeof likesCache === 'object') {
      likesCache[videoUrl] = (likesCache[videoUrl] || 0) + 1;
      return likesCache[videoUrl];
    }
    throw error;
  }
}

async function fetchLikesFromGist() {
  const now = Date.now();
  if (typeof lastFetchTime !== 'undefined' && typeof CACHE_DURATION !== 'undefined') {
    if (now - lastFetchTime < CACHE_DURATION) return likesCache;
  }
  if (typeof isFetchingLikes !== 'undefined' && isFetchingLikes) {
    await new Promise(resolve => {
      const t = setInterval(() => { if (!isFetchingLikes) { clearInterval(t); resolve(); } }, 100);
    });
    return likesCache;
  }
  if (typeof isFetchingLikes !== 'undefined') isFetchingLikes = true;
  try {
    const res = await fetch(LIKES_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (typeof likesCache === 'object') likesCache = data;
    if (typeof lastFetchTime !== 'undefined') lastFetchTime = now;
    console.log('📝 いいねデータを取得しました:', data);
    return data;
  } catch (e) {
    console.error('⚠️ いいねデータの取得に失敗:', e);
    return likesCache || {};
  } finally {
    if (typeof isFetchingLikes !== 'undefined') isFetchingLikes = false;
  }
}

async function updateGist(likesData) {
  try {
    if (likesData && Object.keys(likesData).length === 0) {
      const headers = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined' && window.ADMIN_TOKEN) headers['X-Admin-Token'] = window.ADMIN_TOKEN;
      const res = await fetch(`${LIKES_API_URL}?action=reset`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'reset' })
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      console.log('✅ いいねデータをリセットしました');
      return;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined' && window.ADMIN_TOKEN) headers['X-Admin-Token'] = window.ADMIN_TOKEN;
    const res = await fetch(LIKES_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'bulk', data: likesData })
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    console.log('✅ いいねデータを反映しました');
  } catch (error) {
    console.error('いいねデータの更新に失敗:', error);
    throw error;
  }
}
