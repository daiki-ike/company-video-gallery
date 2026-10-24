// グローバル変数
let currentCategory = 'category1';
let currentVideo = null;
let videoData = window.videoData || {}; // 動画データを格納（config.jsで宣言済み、またはサーバーから取得）

// カテゴリー説明
const categoryDescriptions = {
    'category1': '会社やイベントの魅力を伝える映像。ブランドの世界観や想いを印象的に表現。',
    'category2': '新しい仲間を迎えるための映像。働く人の姿や社風を紹介。',
    'category3': '実際の業務シーンを切り取った映像。仕事内容や現場の雰囲気をわかりやすく伝える。',
    'category4': '学生やフリーター向けに、働く楽しさやチームの雰囲気を明るく描く映像。'
};

// いいね数を管理するLocalStorage
const LIKES_STORAGE_KEY = 'videoLikes';

// いいね数を取得
function getLikes(videoUrl) {
    const likes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}');
    return likes[videoUrl] || 0;
}

// いいね数を保存
function saveLike(videoUrl) {
    const likes = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}');
    likes[videoUrl] = (likes[videoUrl] || 0) + 1;
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
    return likes[videoUrl];
}

// 全てのいいね数を取得
function getAllLikes() {
    return JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}');
}

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();


});

// アプリの初期化
async function initializeApp() {
    setupCategoryTabs();
    await loadVideoData(); // 動画データを読み込み

    // いいねデータの読み込みを待つ（likes-override.jsで定義）
    if (typeof fetchLikesFromGist === 'function') {
        try {
            await fetchLikesFromGist();
        } catch (e) {
            console.warn('いいねデータの初期読込に失敗:', e);
        }
    }

    displayVideos(currentCategory);
    displayCertificates(currentCategory);
    setupModal();
}

// 動画データを読み込む
async function loadVideoData() {
    console.log('🔄 動画データの読み込みを開始します...');

    try {
        // サーバーから自動読み込みを試みる
        console.log('📡 サーバーAPIにリクエスト中: get-videos.php');
        const response = await fetch('get-videos.php');

        console.log('📥 レスポンス受信:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText
        });

        if (response.ok) {
            const data = await response.json();
            videoData = data;
            console.log('✅ 動画データをサーバーから自動読み込みしました');
            console.log('📊 読み込んだ動画数:', Object.values(data).reduce((sum, arr) => sum + arr.length, 0));
            console.log('📂 カテゴリー別:', {
                category1: data.category1?.length || 0,
                category2: data.category2?.length || 0,
                category3: data.category3?.length || 0,
                category4: data.category4?.length || 0
            });
            return;
        } else {
            console.warn('⚠️ サーバーがエラーを返しました:', response.status);
        }
    } catch (error) {
        console.log('⚠️ サーバーAPIが使用できません。config.jsから読み込みます');
        console.log('🐛 エラー詳細:', error.message);
    }

    // サーバーAPIが使えない場合は従来のconfig.jsを使用
    if (typeof window.videoData !== 'undefined' && window.videoData !== null) {
        videoData = window.videoData;
        console.log('✅ 動画データをconfig.jsから読み込みました');
        console.log('📊 読み込んだ動画数:', Object.values(videoData).reduce((sum, arr) => sum + arr.length, 0));
    } else {
        console.error('❌ 動画データが見つかりません');
        console.error('💡 ヒント: サーバーが起動しているか、config.jsが正しく設定されているか確認してください');
        videoData = {
            category1: [],
            category2: [],
            category3: [],
            category4: []
        };
    }
}

// カテゴリータブのセットアップ
function setupCategoryTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // すべてのタブから active クラスを削除
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // クリックされたタブに active クラスを追加
            this.classList.add('active');

            // カテゴリーを更新して動画を表示
            currentCategory = this.dataset.category;
            updateCategoryDescription(currentCategory);
            displayVideos(currentCategory);
            displayCertificates(currentCategory);
        });
    });
}

// カテゴリー説明を更新
function updateCategoryDescription(category) {
    const descriptionText = document.getElementById('categoryDescriptionText');
    if (descriptionText && categoryDescriptions[category]) {
        descriptionText.textContent = categoryDescriptions[category];
    }
}

// 動画の表示
function displayVideos(category) {
    console.log('🎬 動画を表示します:', {
        category: category,
        videoCount: (videoData[category] || []).length
    });

    const videoGrid = document.getElementById('videoGrid');
    let videos = videoData[category] || [];

    // グリッドをクリア
    videoGrid.innerHTML = '';

    if (videos.length === 0) {
        console.warn('⚠️ このカテゴリーには動画がありません:', category);
        videoGrid.innerHTML = '<div class="loading">このカテゴリーには動画がありません</div>';
        return;
    }

    // いいね数でソート（降順）、いいね数が同じ場合はファイル名順（昇順）
    const videosWithLikes = videos.map(video => ({
        ...video,
        likes: getLikes(video.url)
    }));
    videosWithLikes.sort((a, b) => {
        // いいね数が違う場合は、いいね数の多い順
        if (b.likes !== a.likes) {
            return b.likes - a.likes;
        }
        // いいね数が同じ場合は、タイトル名で自然順ソート
        return a.title.localeCompare(b.title, 'ja', { numeric: true, sensitivity: 'base' });
    });

    // 各動画のカードを作成
    console.log('📝 動画カードを作成中...', videos.length, '個');
    videosWithLikes.forEach((video, index) => {
        const card = createVideoCard(video, index);
        videoGrid.appendChild(card);
    });
    console.log('✅ 動画カードの表示完了');
}

// 動画カードの作成
function createVideoCard(video, index) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.videoIndex = index;

    // アスペクト比に応じたクラスを追加
    const aspectRatio = getAspectRatioClass(video);
    card.classList.add(aspectRatio);

    // サムネイル画像または動画プレビュー（遅延読み込み対応）
    // URLをエンコード（スペースなどの特殊文字に対応）
    const encodedUrl = video.url.split('/').map(encodeURIComponent).join('/');
    const thumbnailHTML = video.thumbnail
        ? `<img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">`
        : `<video class="video-thumbnail" data-src="${encodedUrl}#t=${video.thumbnailTime || 2}" preload="none" muted loop></video>`;

    // 現在のいいね数を取得
    const currentLikes = getLikes(video.url);

    // ランキングバッジを作成
    let rankBadge = '';
    if (index === 0 && currentLikes > 0) {
        rankBadge = '<div class="rank-badge rank-1">🥇</div>';
    } else if (index === 1 && currentLikes > 0) {
        rankBadge = '<div class="rank-badge rank-2">🥈</div>';
    } else if (index === 2 && currentLikes > 0) {
        rankBadge = '<div class="rank-badge rank-3">🥉</div>';
    } else if (index >= 3 && index <= 9 && currentLikes > 0) {
        // 4位～10位は順位と総いいね数を表示
        rankBadge = `<div class="rank-badge rank-other">${index + 1}位 (${currentLikes})</div>`;
    }

    card.innerHTML = `
        <div class="video-thumbnail-container">
            ${thumbnailHTML}
            ${rankBadge}
            <div class="play-overlay">
                <div class="play-button"></div>
            </div>
        </div>
        <div class="video-info">
            <div class="video-title">${video.title}</div>
            <div class="video-description">${video.description || ''}</div>
            <div class="video-likes">
                <span class="like-icon">♥</span>
                <span class="like-count">${currentLikes}</span>
            </div>
        </div>
    `;

    const videoElement = card.querySelector('video');

    // サムネイルが動画の場合の処理（遅延読み込み対応）
    if (videoElement) {
        // Intersection Observerで遅延読み込み
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 画面に表示されたら動画を読み込む
                    const video = entry.target;
                    const videoSrc = video.getAttribute('data-src');

                    if (videoSrc && !video.src) {
                        video.src = videoSrc;
                        video.preload = 'metadata';

                        // メタデータ読み込み後の処理
                        video.addEventListener('loadedmetadata', function() {
                            // アスペクト比を自動検出
                            if (!video.aspectRatio) {
                                const detectedAspectRatio = detectAspectRatioFromVideo(this);
                                card.classList.remove('aspect-9-16', 'aspect-16-9');
                                card.classList.add(detectedAspectRatio);
                            }

                            // 指定された時間にシーク
                            if (video.thumbnailTime) {
                                this.currentTime = video.thumbnailTime;
                            } else {
                                this.currentTime = 2; // デフォルトは2秒
                            }
                        });
                    }

                    // 一度読み込んだら監視を解除
                    observer.unobserve(video);
                }
            });
        }, {
            rootMargin: '50px' // 画面の50px手前から読み込み開始
        });

        observer.observe(videoElement);

        // ホバーで動画をプレビュー再生
        card.addEventListener('mouseenter', function() {
            if (videoElement.src) {
                videoElement.play().catch(err => {
                    console.log('自動再生エラー:', err);
                });
            }
        });

        card.addEventListener('mouseleave', function() {
            if (videoElement.src) {
                videoElement.pause();
                const seekTime = video.thumbnailTime || 2;
                videoElement.currentTime = seekTime;
            }
        });
    }

    // クリックイベント
    card.addEventListener('click', function() {
        openVideoModal(video);
    });

    return card;
}

// アスペクト比のクラス名を取得
function getAspectRatioClass(video) {
    // config.jsで指定されたアスペクト比を優先
    if (video.aspectRatio === '16:9') {
        return 'aspect-16-9';
    } else if (video.aspectRatio === '9:16') {
        return 'aspect-9-16';
    }
    // デフォルトは9:16（縦動画）
    return 'aspect-9-16';
}

// 動画から自動的にアスペクト比を検出
function detectAspectRatioFromVideo(videoElement) {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    // 横長か縦長かを判定
    if (width > height) {
        return 'aspect-16-9';
    } else {
        return 'aspect-9-16';
    }
}

// モーダルのセットアップ
function setupModal() {
    const modal = document.getElementById('videoModal');
    const closeButton = document.querySelector('.close-button');

    // 閉じるボタン
    closeButton.addEventListener('click', closeVideoModal);

    // モーダル外をクリックで閉じる
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeVideoModal();
        }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeVideoModal();
        }
    });
}

// モーダルを開く
function openVideoModal(video) {
    currentVideo = video;

    const modal = document.getElementById('videoModal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = document.getElementById('modalTitle');
    const modalVideo = document.getElementById('modalVideo');
    const likeButton = document.getElementById('likeButton');

    // トップ3の動画かどうか判定して紙吹雪を表示
    const rank = getVideoRank(video);
    if (rank >= 1 && rank <= 3) {
        fireConfetti(rank);
    }

    // モーダルの内容を設定
    modalTitle.textContent = video.title;
    // URLをエンコード（スペースなどの特殊文字に対応）
    const encodedUrl = video.url.split('/').map(encodeURIComponent).join('/');
    modalVideo.src = encodedUrl;

    // アスペクト比に応じたクラスを追加
    const aspectRatio = getAspectRatioClass(video);
    modalContent.classList.remove('aspect-9-16', 'aspect-16-9');
    modalContent.classList.add(aspectRatio);

    // アスペクト比が指定されていない場合は、メタデータから自動検出
    if (!video.aspectRatio) {
        modalVideo.addEventListener('loadedmetadata', function handleMetadata() {
            const detectedAspectRatio = detectAspectRatioFromVideo(modalVideo);
            modalContent.classList.remove('aspect-9-16', 'aspect-16-9');
            modalContent.classList.add(detectedAspectRatio);
            modalVideo.removeEventListener('loadedmetadata', handleMetadata);
        });
    }

    // いいねボタンの状態をリセット
    likeButton.classList.remove('liked');
    const heart = likeButton.querySelector('.heart');
    const likeText = likeButton.querySelector('.like-text');
    heart.textContent = '♡';

    // 現在のいいね数を表示
    const currentLikes = getLikes(video.url);
    likeText.textContent = currentLikes > 0 ? `いいね (${currentLikes})` : 'いいね';

    // いいねボタンのイベント
    likeButton.onclick = function() {
        handleLike(video);
    };

    // モーダルを表示
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 動画を再生
    modalVideo.play();
}

// モーダルを閉じる
function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');

    // 動画を停止
    modalVideo.pause();
    modalVideo.src = '';

    // モーダルを非表示
    modal.classList.remove('active');
    document.body.style.overflow = '';

    currentVideo = null;
}

// いいねボタンの処理
function handleLike(video) {
    const likeButton = document.getElementById('likeButton');
    const heart = likeButton.querySelector('.heart');
    const likeText = likeButton.querySelector('.like-text');

    // ボタンの状態を切り替え
    if (!likeButton.classList.contains('liked')) {
        likeButton.classList.add('liked');
        heart.textContent = '♥';

        // ローカルストレージにいいねを保存
        const newLikeCount = saveLike(video.url);
        console.log('いいねを保存しました:', video.title, '- 合計:', newLikeCount);

        // フィードバック
        likeText.textContent = 'ありがとうございます！';
        setTimeout(() => {
            likeText.textContent = `いいね (${newLikeCount})`;
        }, 1500);

        // 表示を更新（他のカードのいいね数も更新）
        setTimeout(() => {
            displayVideos(currentCategory);
            displayCertificates(currentCategory);
        }, 2000);
    }
}

// 動画のランクを取得
function getVideoRank(video) {
    const videos = videoData[currentCategory] || [];

    // いいね数でソート（降順）
    const videosWithLikes = videos.map(v => ({
        ...v,
        likes: getLikes(v.url)
    }));
    videosWithLikes.sort((a, b) => {
        if (b.likes !== a.likes) {
            return b.likes - a.likes;
        }
        return a.title.localeCompare(b.title, 'ja', { numeric: true, sensitivity: 'base' });
    });

    // 現在の動画のランクを取得
    const index = videosWithLikes.findIndex(v => v.url === video.url);
    return index + 1; // 1位から始まるランク
}

// 紙吹雪を発射
function fireConfetti(rank) {
    if (typeof confetti === 'undefined') {
        console.warn('紙吹雪ライブラリが読み込まれていません');
        return;
    }

    // ランクに応じた紙吹雪の設定
    const configs = {
        1: { // 1位：豪華な金色の紙吹雪
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FFFF00']
        },
        2: { // 2位：銀色の紙吹雪
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#C0C0C0', '#D3D3D3', '#E8E8E8']
        },
        3: { // 3位：銅色の紙吹雪
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#CD7F32', '#B87333', '#E6A85C']
        }
    };

    const config = configs[rank] || configs[3];

    // 紙吹雪を発射
    confetti(config);

    // 追加の紙吹雪を左右から発射（1位のみ）
    if (rank === 1) {
        setTimeout(() => {
            confetti({
                ...config,
                angle: 60,
                origin: { x: 0, y: 0.8 }
            });
            confetti({
                ...config,
                angle: 120,
                origin: { x: 1, y: 0.8 }
            });
        }, 250);
    }
}


// トップ3表彰状を表示
function displayCertificates(category) {
    const container = document.getElementById('certificateContainer');
    if (!container) return;

    const videos = videoData[category] || [];

    // いいね数でソート（降順）
    const videosWithLikes = videos.map(v => ({
        ...v,
        likes: getLikes(v.url)
    }));
    videosWithLikes.sort((a, b) => {
        if (b.likes !== a.likes) {
            return b.likes - a.likes;
        }
        return a.title.localeCompare(b.title, 'ja', { numeric: true, sensitivity: 'base' });
    });

    // トップ3のみ取得
    const top3 = videosWithLikes.slice(0, 3).filter(v => v.likes > 0);

    // コンテナをクリア
    container.innerHTML = '';

    if (top3.length === 0) {
        container.innerHTML = '<p style="color: var(--text-gray); padding: 2rem;">まだいいねがありません</p>';
        return;
    }

    // 各動画の表彰状カードを作成
    top3.forEach((video, index) => {
        const rank = index + 1;
        const medals = ['🥇', '🥈', '🥉'];
        const rankNames = ['第1位', '第2位', '第3位'];

        const card = document.createElement('div');
        card.className = 'certificate-card';
        card.innerHTML = `
            <div class="certificate-rank">${medals[index]}</div>
            <div class="certificate-video-title">${video.title}</div>
            <div class="certificate-likes">いいね数: ${video.likes}</div>
            <button class="certificate-download-btn" onclick="downloadCertificate('${video.url}', ${rank}, '${video.title.replace(/'/g, "\\'")}', ${video.likes})">
                📥 表彰状をダウンロード
            </button>
        `;
        container.appendChild(card);
    });
}

// 表彰状を生成してダウンロード
function downloadCertificate(videoUrl, rank, title, likes) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // 背景色（グラデーション）
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (rank === 1) {
        gradient.addColorStop(0, '#FFF8DC');
        gradient.addColorStop(1, '#FFE4B5');
    } else if (rank === 2) {
        gradient.addColorStop(0, '#F0F0F0');
        gradient.addColorStop(1, '#E8E8E8');
    } else {
        gradient.addColorStop(0, '#FFF0E0');
        gradient.addColorStop(1, '#FFE4CC');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 枠線
    ctx.strokeStyle = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // 内側の枠線
    ctx.strokeStyle = rank === 1 ? '#FFA500' : rank === 2 ? '#A8A8A8' : '#B87333';
    ctx.lineWidth = 3;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // タイトル
    ctx.fillStyle = '#333';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('表彰状', canvas.width / 2, 100);

    // メダル
    const medals = ['🥇', '🥈', '🥉'];
    ctx.font = '80px sans-serif';
    ctx.fillText(medals[rank - 1], canvas.width / 2, 200);

    // 順位
    const rankNames = ['第1位', '第2位', '第3位'];
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
    ctx.fillText(rankNames[rank - 1], canvas.width / 2, 260);

    // 動画タイトル
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    // テキストを折り返す
    const maxWidth = 700;
    const words = title.split('');
    let line = '';
    let y = 330;
    const lineHeight = 35;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, canvas.width / 2, y);
            line = words[i];
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, canvas.width / 2, y);

    // いいね数
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`いいね数: ${likes}`, canvas.width / 2, y + 60);

    // 日付
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    ctx.font = '20px sans-serif';
    ctx.fillText(dateStr, canvas.width / 2, canvas.height - 80);

    // ダウンロード
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `表彰状_${rankNames[rank - 1]}_${title}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}


