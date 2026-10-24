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

    // ランキングバッジを作成（トップ3のみ、メダルのみ表示）
    let rankBadge = '';
    if (index === 0 && currentLikes > 0) {
        rankBadge = '<div class="rank-badge rank-1">🥇</div>';
    } else if (index === 1 && currentLikes > 0) {
        rankBadge = '<div class="rank-badge rank-2">🥈</div>';
    } else if (index === 2 && currentLikes > 0) {
        rankBadge = '<div class="rank-badge rank-3">🥉</div>';
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
        }, 2000);
    }
}



