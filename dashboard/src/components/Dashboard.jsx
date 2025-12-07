import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { fetchAllSalesSheets } from '../utils/sheetsApi';
import './Dashboard.css';

// チーム別の色定義
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

/**
 * 金額をフォーマット
 * @param {number} value
 * @returns {string}
 */
function formatMoney(value) {
  if (!value || isNaN(value)) return '¥0';
  return `¥${value.toLocaleString()}`;
}

/**
 * インラインバーグラフコンポーネント
 */
function InlineBar({ value, maxValue, color = '#4CAF50' }) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="inline-bar-container">
      <div
        className="inline-bar"
        style={{
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
}

/**
 * 部門別ランキングテーブルコンポーネント
 */
function DepartmentRankingTable({ department, maxSales, maxProfit }) {
  return (
    <div className="department-section">
      <h3 className="department-title">{department.name} 個人ランキング</h3>
      <table className="ranking-table">
        <thead>
          <tr>
            <th className="col-rank">順位</th>
            <th className="col-name">氏名</th>
            <th className="col-sales">売上額</th>
            <th className="col-bar">売上グラフ</th>
            <th className="col-profit">粗利額</th>
            <th className="col-bar">粗利グラフ</th>
          </tr>
        </thead>
        <tbody>
          {department.rankings.map((person, idx) => (
            <tr key={`${person.name}-${idx}`}>
              <td className="col-rank">{person.rank || idx + 1}</td>
              <td className="col-name">{person.name}</td>
              <td className="col-sales">{formatMoney(person.sales)}</td>
              <td className="col-bar">
                <InlineBar value={person.sales} maxValue={maxSales} color="#2196F3" />
              </td>
              <td className="col-profit">{formatMoney(person.grossProfit)}</td>
              <td className="col-bar">
                <InlineBar value={person.grossProfit} maxValue={maxProfit} color="#4CAF50" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * チーム別円グラフコンポーネント
 */
function TeamPieChart({ teamSummary, dataKey = 'sales', title }) {
  const chartData = teamSummary.map((team, idx) => ({
    name: team.team,
    value: team[dataKey] || 0,
    color: COLORS[idx % COLORS.length]
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="pie-chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-total">合計: {formatMoney(total)}</div>
    </div>
  );
}

/**
 * 地域タブコンポーネント
 */
function RegionTab({ data, regionName }) {
  // 最大値を計算（全部門共通のスケール）
  const { maxSales, maxProfit } = useMemo(() => {
    let maxS = 0;
    let maxP = 0;
    data.departments.forEach(dept => {
      dept.rankings.forEach(person => {
        if (person.sales > maxS) maxS = person.sales;
        if (person.grossProfit > maxP) maxP = person.grossProfit;
      });
    });
    return { maxSales: maxS, maxProfit: maxP };
  }, [data.departments]);

  if (data.teamSummary.length === 0 && data.departments.length === 0) {
    return (
      <div className="region-content">
        <p className="no-data">データがありません</p>
      </div>
    );
  }

  return (
    <div className="region-content">
      {/* チーム別サマリー円グラフ */}
      {data.teamSummary.length > 0 && (
        <div className="charts-section">
          <TeamPieChart
            teamSummary={data.teamSummary}
            dataKey="sales"
            title={`${regionName} チーム別売上`}
          />
          <TeamPieChart
            teamSummary={data.teamSummary}
            dataKey="grossProfit"
            title={`${regionName} チーム別粗利`}
          />
        </div>
      )}

      {/* チーム別サマリーテーブル */}
      {data.teamSummary.length > 0 && (
        <div className="team-summary-section">
          <h3>チーム別サマリー</h3>
          <table className="ranking-table team-summary-table">
            <thead>
              <tr>
                <th>順位</th>
                <th>チーム</th>
                <th>売上高</th>
                <th>支払高</th>
                <th>粗利益</th>
              </tr>
            </thead>
            <tbody>
              {data.teamSummary.map((team, idx) => (
                <tr key={`${team.team}-${idx}`}>
                  <td>{team.rank || idx + 1}</td>
                  <td>{team.team}</td>
                  <td>{formatMoney(team.sales)}</td>
                  <td>{formatMoney(team.payments)}</td>
                  <td>{formatMoney(team.grossProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 部門別個人ランキング */}
      {data.departments.length > 0 && (
        <div className="departments-section">
          <h2>部門別個人ランキング</h2>
          {data.departments.map((dept, idx) => (
            <DepartmentRankingTable
              key={`${dept.name}-${idx}`}
              department={dept}
              maxSales={maxSales}
              maxProfit={maxProfit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 全体シートテーブルコンポーネント
 */
function OverallTable({ data }) {
  if (!data || data.length === 0) {
    return <p className="no-data">データがありません</p>;
  }

  // データから動的にカラムを取得
  const columns = Object.keys(data[0]).filter(key =>
    !['rank', 'sales', 'grossProfit'].includes(key)
  );

  return (
    <div className="overall-section">
      <table className="ranking-table overall-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map(col => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * メインダッシュボードコンポーネント
 */
export default function Dashboard() {
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overall');

  const tabs = [
    { id: 'overall', label: '全体' },
    { id: 'tokyo', label: '東京' },
    { id: 'osaka', label: '大阪' },
    { id: 'nagoya', label: '名古屋' },
    { id: 'kikakukaihatsu', label: '企画開発' }
  ];

  const handleLoadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAllSalesSheets();
      setSalesData(data);
      console.log('[Dashboard] Data loaded:', data);
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
      setError(err.message || 'データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (!salesData) return null;

    if (activeTab === 'overall') {
      return <OverallTable data={salesData.overall} />;
    }

    const regionData = salesData[activeTab];
    if (!regionData) {
      return <p className="no-data">データがありません</p>;
    }

    const regionNames = {
      tokyo: '東京',
      osaka: '大阪',
      nagoya: '名古屋',
      kikakukaihatsu: '企画開発'
    };

    return <RegionTab data={regionData} regionName={regionNames[activeTab]} />;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>社員評価ダッシュボード</h1>
        <p className="subtitle">売上ランキング分析</p>
      </header>

      <div className="controls">
        <button
          className="load-button"
          onClick={handleLoadData}
          disabled={loading}
        >
          {loading ? '読み込み中...' : '売上ランキングデータを読み込む'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {salesData && (
        <>
          <nav className="tab-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="tab-content">
            {renderTabContent()}
          </main>
        </>
      )}
    </div>
  );
}
