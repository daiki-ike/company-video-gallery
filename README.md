# 動画紹介サイト

9:16の縦動画を紹介するシンプルでスタイリッシュなWebサイトです。

## 特徴

- **4カテゴリー対応**: 4種類のパターンに分けて動画を整理
- **2列グリッド表示**: 動画を2つずつ並べて表示
- **レスポンシブデザイン**: PC・タブレット・スマートフォンに最適化
- **動画選択機能**: クリックで動画を再生
- **いいね機能**: Google Formsと連携した集計システム
- **動的管理**: config.jsで簡単に動画の追加・削除が可能

## ファイル構成

```
テスト/
├── index.html          # メインHTMLファイル
├── styles.css          # スタイルシート
├── script.js           # JavaScript機能
├── config.js           # 動画データとGoogle Forms設定
├── README.md           # このファイル
├── videos/             # 動画保管フォルダ
│   ├── category1/      # カテゴリー1の動画
│   ├── category2/      # カテゴリー2の動画
│   ├── category3/      # カテゴリー3の動画
│   └── category4/      # カテゴリー4の動画
└── images/             # サムネイル画像フォルダ
```

## セットアップ方法

### 1. 動画の追加

1. 動画ファイルを対応するカテゴリーフォルダに配置
   - 例: `videos/category1/video1.mp4`

2. サムネイル画像を `images/` フォルダに配置（オプション）
   - 例: `images/thumb1-1.jpg`

3. `config.js` を編集して動画情報を追加

```javascript
category1: [
    {
        title: '動画のタイトル',
        description: '動画の説明文',
        url: 'videos/category1/video1.mp4',
        thumbnail: 'images/thumb1-1.jpg'  // オプション
    }
]
```

### 2. Google Formsの設定

#### 手順1: フォームを作成

1. [Google Forms](https://docs.google.com/forms) にアクセス
2. 新しいフォームを作成
3. 以下の質問を追加:
   - **動画タイトル** (記述式)
   - **カテゴリー** (記述式)
   - **タイムスタンプ** (記述式)

#### 手順2: エントリーIDを取得

1. フォームのプレビューを開く
2. ブラウザの開発者ツール (F12) を開く
3. HTMLソースを表示
4. 各入力フィールドの `name="entry.xxxxxxx"` を確認
5. これらのIDをメモ

#### 手順3: フォームURLを取得

1. フォームの「送信」ボタンをクリック
2. リンクタブを選択
3. URLをコピー
4. URLの `/viewform` を `/formResponse` に変更

**例:**
- 元: `https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform`
- 変更後: `https://docs.google.com/forms/d/e/1FAIpQLSc.../formResponse`

#### 手順4: config.jsに設定

`config.js` の `googleFormConfig` セクションを編集:

```javascript
const googleFormConfig = {
    formUrl: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse',
    videoTitleEntry: 'entry.123456789',
    categoryEntry: 'entry.987654321',
    timestampEntry: 'entry.111111111'
};
```

#### 手順5: スプレッドシートとリンク（オプション）

1. フォームの「回答」タブをクリック
2. スプレッドシートアイコンをクリック
3. 自動的に集計シートが作成されます

## カスタマイズ

### カテゴリー名の変更

[index.html](index.html#L18-L21) の該当箇所を編集:

```html
<button class="tab-button active" data-category="category1">カテゴリー 1</button>
<button class="tab-button" data-category="category2">カテゴリー 2</button>
```

### 色の変更

[styles.css](styles.css#L9-L16) の CSS変数を編集:

```css
:root {
    --primary-blue: #2563eb;  /* メインの青色 */
    --light-blue: #3b82f6;    /* ライトブルー */
    --bg-white: #ffffff;       /* 背景白 */
    --bg-gray: #f8fafc;        /* 背景グレー */
}
```

### グリッドレイアウトの変更

[styles.css](styles.css#L76-L80) で列数を変更:

```css
.video-grid {
    grid-template-columns: repeat(2, 1fr);  /* 2列 */
}
```

## 動画の追加・削除

### 動画を追加する場合

1. 動画ファイルを `videos/categoryX/` に配置
2. サムネイルを `images/` に配置（オプション）
3. `config.js` に動画情報を追加

### 動画を削除する場合

1. `config.js` から該当する動画情報を削除
2. 不要な動画ファイルとサムネイルを削除

## ブラウザ対応

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
- モバイルブラウザ (iOS Safari, Chrome Mobile)

## トラブルシューティング

### 動画が表示されない

- 動画ファイルのパスが正しいか確認
- 動画ファイル形式が対応しているか確認 (mp4推奨)
- ブラウザのコンソールでエラーを確認

### サムネイルが表示されない

- 画像ファイルのパスが正しいか確認
- 画像ファイル形式が対応しているか確認 (jpg, png推奨)

### いいねが送信されない

- Google Formsの設定が正しいか確認
- ブラウザのコンソールでエラーを確認
- フォームURLが `/formResponse` で終わっているか確認

### モバイルでレイアウトが崩れる

- ブラウザのキャッシュをクリア
- CSSファイルが正しく読み込まれているか確認

## 使用技術

- HTML5
- CSS3 (Grid Layout, Flexbox)
- JavaScript (ES6+)
- Google Forms API

## ライセンス

このプロジェクトは自由に使用・改変できます。

## サポート

質問や問題がある場合は、開発者にお問い合わせください。
