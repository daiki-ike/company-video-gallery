/**
 * Google Sheets API ユーティリティ
 * gviz APIを使用してスプレッドシートからデータを取得
 */

const SPREADSHEET_ID = '1ySCbLFCgnnLgEQUszfBc5BubkXwH3P4kDbLJnibgn1M';
const SHEET_NAMES = {
  overall: '全体',
  tokyo: '東京',
  osaka: '大阪',
  nagoya: '名古屋',
  kikakukaihatsu: '企画開発'
};

/**
 * 金額文字列を数値に変換
 * @param {string} value - "¥1,234,567" 形式の文字列
 * @returns {number}
 */
function parseMoneyValue(value) {
  if (!value || typeof value !== 'string') return 0;
  // ¥記号、カンマを除去して数値に変換
  return parseInt(value.replace(/[¥,]/g, ''), 10) || 0;
}

/**
 * パーセント文字列を数値に変換
 * @param {string} value - "12.34%" 形式の文字列
 * @returns {number}
 */
function parsePercentValue(value) {
  if (!value || typeof value !== 'string') return 0;
  return parseFloat(value.replace('%', '')) || 0;
}

/**
 * gviz APIからスプレッドシートデータを取得
 * @param {string} sheetName - シート名
 * @returns {Promise<object>} gviz レスポンス
 */
async function fetchGvizData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  console.log(`[fetchGvizData] Fetching: ${sheetName}`);

  const response = await fetch(url);
  const text = await response.text();

  // gvizレスポンスは "google.visualization.Query.setResponse({...})" 形式
  // JSON部分を抽出
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  if (!jsonMatch) {
    throw new Error(`Invalid gviz response for sheet: ${sheetName}`);
  }

  return JSON.parse(jsonMatch[1]);
}

/**
 * gvizのセル値を取得
 * @param {object} cell - gviz cell object
 * @returns {string|number|null}
 */
function getCellValue(cell) {
  if (!cell) return null;
  // formatted value があればそれを使用、なければ value
  return cell.f !== undefined ? cell.f : cell.v;
}

/**
 * 行が空かどうかチェック
 * @param {Array} row - gviz row
 * @returns {boolean}
 */
function isEmptyRow(row) {
  if (!row || !row.c) return true;
  return row.c.every(cell => {
    const val = getCellValue(cell);
    return val === null || val === '' || val === undefined;
  });
}

/**
 * ヘッダー行のタイプを判定
 * @param {Array} row - gviz row
 * @returns {'teamSummary'|'personalRanking'|null}
 */
function detectHeaderType(row) {
  if (!row || !row.c) return null;

  const values = row.c.map(cell => getCellValue(cell));
  const headerText = values.join(' ').toLowerCase();

  // チーム別サマリーのヘッダー: 「順位」「チーム」が含まれる
  if (headerText.includes('順位') && headerText.includes('チーム') && !headerText.includes('氏名')) {
    return 'teamSummary';
  }

  // 個人ランキングのヘッダー: 「順位」「氏名」が含まれる
  if (headerText.includes('順位') && headerText.includes('氏名')) {
    return 'personalRanking';
  }

  return null;
}

/**
 * チーム名を所属チーム列から抽出
 * @param {Array} rows - データ行の配列
 * @returns {string|null}
 */
function extractTeamName(rows) {
  for (const row of rows) {
    if (!row || !row.c) continue;
    // 所属チーム列を探す（通常3列目）
    for (const cell of row.c) {
      const val = getCellValue(cell);
      if (val && typeof val === 'string' &&
          (val.includes('マネジメント') ||
           val.includes('制作') ||
           val.includes('企画') ||
           val.includes('開発'))) {
        return val;
      }
    }
  }
  return null;
}

/**
 * 全体シートをパース（従来形式）
 * @param {object} gvizData - gviz レスポンス
 * @returns {Array}
 */
function parseOverallSheet(gvizData) {
  const table = gvizData.table;
  if (!table || !table.rows) return [];

  const result = [];
  let headers = [];
  let headerFound = false;

  for (const row of table.rows) {
    if (isEmptyRow(row)) continue;

    const values = row.c.map(cell => getCellValue(cell));

    // 最初の非空行をヘッダーとして使用
    if (!headerFound && values[0] === '順位') {
      headers = values;
      headerFound = true;
      continue;
    }

    if (headerFound && values[0]) {
      const record = {};
      headers.forEach((header, idx) => {
        if (header) {
          record[header] = values[idx];
        }
      });

      // 数値変換
      if (record['順位']) record.rank = parseInt(record['順位'], 10);
      if (record['売上額'] || record['売上高']) {
        record.sales = parseMoneyValue(record['売上額'] || record['売上高']);
      }
      if (record['粗利額'] || record['粗利益']) {
        record.grossProfit = parseMoneyValue(record['粗利額'] || record['粗利益']);
      }

      result.push(record);
    }
  }

  console.log(`[parseOverallSheet] Parsed ${result.length} records`);
  return result;
}

/**
 * 部門別シートをパース（チーム別サマリー + 部門別ランキング）
 * @param {object} gvizData - gviz レスポンス
 * @returns {object} { teamSummary: [...], departments: [...] }
 */
function parseSheetWithDepartments(gvizData) {
  const table = gvizData.table;
  if (!table || !table.rows) {
    return { teamSummary: [], departments: [] };
  }

  console.log(`[parseSheetWithDepartments] Starting parse, total rows: ${table.rows.length}`);

  const result = {
    teamSummary: [],
    departments: []
  };

  let currentSection = null;
  let currentHeaders = [];
  let currentDepartmentName = null;
  let currentDepartmentData = [];

  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];

    if (isEmptyRow(row)) {
      // 空行で部門データをフラッシュ
      if (currentSection === 'personalRanking' && currentDepartmentData.length > 0) {
        const deptName = currentDepartmentName || extractTeamName(currentDepartmentData) || `部門${result.departments.length + 1}`;
        result.departments.push({
          name: deptName,
          rankings: [...currentDepartmentData]
        });
        console.log(`[parseSheetWithDepartments] Saved department: ${deptName} with ${currentDepartmentData.length} records`);
        currentDepartmentData = [];
        currentDepartmentName = null;
      }
      currentSection = null;
      continue;
    }

    const values = row.c.map(cell => getCellValue(cell));
    const headerType = detectHeaderType(row);

    // ヘッダー行検出
    if (headerType) {
      // 前のセクションのデータをフラッシュ
      if (currentSection === 'personalRanking' && currentDepartmentData.length > 0) {
        const deptName = currentDepartmentName || extractTeamName(currentDepartmentData) || `部門${result.departments.length + 1}`;
        result.departments.push({
          name: deptName,
          rankings: [...currentDepartmentData]
        });
        console.log(`[parseSheetWithDepartments] Saved department: ${deptName} with ${currentDepartmentData.length} records`);
        currentDepartmentData = [];
      }

      currentSection = headerType;
      currentHeaders = values;
      currentDepartmentName = null;
      console.log(`[parseSheetWithDepartments] Found header: ${headerType} at row ${i}`);
      continue;
    }

    // セクションタイトル行の検出（【】形式）
    const firstValue = values[0];
    if (firstValue && typeof firstValue === 'string' && firstValue.startsWith('【')) {
      // 部門名を抽出
      const match = firstValue.match(/【.*?([^\s】]+)個人ランキング】/);
      if (match) {
        currentDepartmentName = match[1];
        console.log(`[parseSheetWithDepartments] Found section title: ${firstValue}, department: ${currentDepartmentName}`);
      }
      continue;
    }

    // データ行の処理
    if (currentSection && currentHeaders.length > 0) {
      // 順位が数値でない行はスキップ
      const rankValue = values[0];
      if (rankValue === null || rankValue === undefined ||
          (typeof rankValue === 'string' && isNaN(parseInt(rankValue, 10)))) {
        continue;
      }

      const record = {};
      currentHeaders.forEach((header, idx) => {
        if (header) {
          record[header] = values[idx];
        }
      });

      // 数値変換
      record.rank = parseInt(record['順位'], 10) || 0;

      if (currentSection === 'teamSummary') {
        // チーム別サマリー
        record.team = record['チーム'] || '';
        record.sales = parseMoneyValue(record['売上高']);
        record.payments = parseMoneyValue(record['支払高']);
        record.grossProfit = parseMoneyValue(record['粗利益']);
        result.teamSummary.push(record);
        console.log(`[parseSheetWithDepartments] Added team summary: ${record.team}`);
      } else if (currentSection === 'personalRanking') {
        // 個人ランキング
        record.name = record['氏名'] || '';
        record.belongTeam = record['所属チーム'] || '';
        record.sales = parseMoneyValue(record['売上額']);
        record.salesRatio = parsePercentValue(record['部内売上比率']);
        record.grossProfit = parseMoneyValue(record['粗利額']);

        // 部門名を所属チームから取得
        if (!currentDepartmentName && record.belongTeam) {
          currentDepartmentName = record.belongTeam;
        }

        currentDepartmentData.push(record);
      }
    }
  }

  // 最後の部門データをフラッシュ
  if (currentSection === 'personalRanking' && currentDepartmentData.length > 0) {
    const deptName = currentDepartmentName || extractTeamName(currentDepartmentData) || `部門${result.departments.length + 1}`;
    result.departments.push({
      name: deptName,
      rankings: [...currentDepartmentData]
    });
    console.log(`[parseSheetWithDepartments] Saved last department: ${deptName} with ${currentDepartmentData.length} records`);
  }

  console.log(`[parseSheetWithDepartments] Complete - teamSummary: ${result.teamSummary.length}, departments: ${result.departments.length}`);
  return result;
}

/**
 * 全てのシートから売上データを取得
 * @returns {Promise<object>}
 */
export async function fetchAllSalesSheets() {
  console.log('[fetchAllSalesSheets] Starting fetch...');

  const result = {
    overall: [],
    tokyo: { teamSummary: [], departments: [] },
    osaka: { teamSummary: [], departments: [] },
    nagoya: { teamSummary: [], departments: [] },
    kikakukaihatsu: { teamSummary: [], departments: [] }
  };

  try {
    // 全体シートを取得
    const overallData = await fetchGvizData(SHEET_NAMES.overall);
    result.overall = parseOverallSheet(overallData);
    console.log(`[fetchAllSalesSheets] Overall: ${result.overall.length} records`);
  } catch (error) {
    console.error('[fetchAllSalesSheets] Error fetching overall sheet:', error);
  }

  // 部門別シートを並行して取得
  const departmentSheets = [
    { key: 'tokyo', name: SHEET_NAMES.tokyo },
    { key: 'osaka', name: SHEET_NAMES.osaka },
    { key: 'nagoya', name: SHEET_NAMES.nagoya },
    { key: 'kikakukaihatsu', name: SHEET_NAMES.kikakukaihatsu }
  ];

  await Promise.all(departmentSheets.map(async ({ key, name }) => {
    try {
      const data = await fetchGvizData(name);
      result[key] = parseSheetWithDepartments(data);
      console.log(`[fetchAllSalesSheets] ${key}: teamSummary=${result[key].teamSummary.length}, departments=${result[key].departments.length}`);
    } catch (error) {
      console.error(`[fetchAllSalesSheets] Error fetching ${key} sheet:`, error);
    }
  }));

  console.log('[fetchAllSalesSheets] Complete:', result);
  return result;
}

/**
 * テスト用：特定シートのデータを取得してパース結果を返す
 * @param {string} sheetName - シート名
 * @returns {Promise<object>}
 */
export async function testFetchSheet(sheetName) {
  const data = await fetchGvizData(sheetName);
  console.log('[testFetchSheet] Raw gviz data:', data);

  if (sheetName === SHEET_NAMES.overall) {
    return parseOverallSheet(data);
  } else {
    return parseSheetWithDepartments(data);
  }
}

export { parseMoneyValue, parsePercentValue, SPREADSHEET_ID, SHEET_NAMES };
