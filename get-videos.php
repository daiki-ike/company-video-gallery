<?php
/**
 * 動画フォルダから自動的に動画ファイルを読み込むAPI
 * videosフォルダ内の動画を自動検出してJSON形式で返す
 */

header('Content-Type: application/json; charset=utf-8');

// カテゴリーフォルダのパス
$categories = [
    'category1' => 'videos/category1',
    'category2' => 'videos/category2',
    'category3' => 'videos/category3',
    'category4' => 'videos/category4'
];

// サポートする動画拡張子
$videoExtensions = ['mp4', 'webm', 'mov', 'avi'];

$videoData = [];

foreach ($categories as $categoryKey => $categoryPath) {
    $videoData[$categoryKey] = [];

    // フォルダが存在するか確認
    if (!is_dir($categoryPath)) {
        continue;
    }

    // フォルダ内のファイルを取得
    $files = scandir($categoryPath);

    foreach ($files as $file) {
        // . と .. をスキップ
        if ($file === '.' || $file === '..') {
            continue;
        }

        $filePath = $categoryPath . '/' . $file;

        // ファイルかどうか確認
        if (!is_file($filePath)) {
            continue;
        }

        // 拡張子を取得
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));

        // 動画ファイルかチェック
        if (in_array($extension, $videoExtensions)) {
            // ファイル名から拡張子を除いたものをタイトルにする
            $title = pathinfo($file, PATHINFO_FILENAME);

            // 動画情報を追加
            $videoData[$categoryKey][] = [
                'title' => $title,
                'description' => '',
                'url' => $filePath,
                'thumbnailTime' => 1.0  // デフォルト1秒
            ];
        }
    }

    // ファイル名でソート（自然順）
    usort($videoData[$categoryKey], function($a, $b) {
        return strnatcmp($a['title'], $b['title']);
    });
}

// JSON形式で出力
echo json_encode($videoData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
