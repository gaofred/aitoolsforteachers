export default function StandaloneAdminDashboard() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>管理员控制台</title>
        <style dangerouslySetInnerHTML={{
          __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f9fafb;
            min-height: 100vh;
          }
          
          .header {
            background-color: white;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 0;
          }
          
          .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin: 0;
          }
          
          .user-info {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          
          .welcome {
            font-size: 14px;
            color: #6b7280;
          }
          
          .logout-btn {
            padding: 8px 16px;
            background-color: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .logout-btn:hover {
            background-color: #dc2626;
          }
          
          .nav {
            background-color: white;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .nav-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            gap: 32px;
          }
          
          .nav-tab {
            padding: 16px 0;
            border: none;
            background-color: transparent;
            border-bottom: 2px solid transparent;
            color: #6b7280;
            cursor: pointer;
            font-size: 14px;
            font-weight: 400;
          }
          
          .nav-tab.active {
            border-bottom-color: #3b82f6;
            color: #3b82f6;
            font-weight: 500;
          }
          
          .main {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 20px;
          }
          
          .section {
            display: none;
          }
          
          .section.active {
            display: block;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #111827;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
          }
          
          .stat-card {
            background-color: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #3b82f6;
          }
          
          .stat-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 4px;
          }
          
          .table-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .table th {
            background-color: #f9fafb;
            padding: 12px;
            text-align: left;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
          }
          
          .table td {
            padding: 12px;
            border-top: 指纹 solid #e5e7eb;
            font-size: 14px;
            color: #111827;
          }
          
          .table td.user-info {
            display: flex;
            flex-direction: column;
          }
          
          .table td.user-name {
            font-weight: 500;
            color: #111827;
          }
          
          .table td.user-email {
            font-size: 12px;
            color: #6b7280;
          }
          
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
          }
          
          .badge.premium {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .badge.free {
            background-color: #e5e7eb;
            color: #374151;
          }
          
          .badge.used {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .badge.available {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .create-btn {
            padding: 8px 16px;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 24px;
          }
          
          .create-btn:hover {
            background-color: #2563eb;
          }
          
          .loading {
            text-align: center;
            padding: 40px;
            color: #6b7280;
            font-size: 18px;
          }
        `
        }} />
      </head>
      <body>
        <div className="header">
          <div className="header-content">
            <h1 className="title">管理员控制台</h1>
            <div className="user-info">
              <span className="welcome" id="welcome">欢迎, 管理员</span>
              <button className="logout-btn" id="logoutBtn">退出登录</button>
            </div>
          </div>
        </div>

        <div className="nav">
          <div className="nav-content">
            <button className="nav-tab active" data-tab="dashboard">仪表板</button>
            <button className="nav-tab" data-tab="users">用户管理</button>
            <button className="nav-tab" data-tab="codes">兑换码管理</button>
          </div>
        </div>

        <div className="main">
          <div id="dashboard" className="section active">
            <h2 className="section-title">系统统计</h2>
            <div className="stats-grid" id="statsGrid">
              <div className="loading">加载中...</div>
            </div>
          </div>

          <div id="users" className="section">
            <h2 className="section-title">用户管理</h2>
            <div className="table-container">
              <table className="table" id="usersTable">
                <thead>
                  <tr>
                    <th>用户信息</th>
                    <th>点数</th>
                    <th>会员类型</th>
                    <th>注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="loading">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div id="codes" className="section">
            <h2 className="section-title">兑换码管理</h2>
            <button className="create-btn" id="createBtn">创建兑换码</button>
            <div className="table-container">
              <table className="table" id="codesTable">
                <thead>
                  <tr>
                    <th>兑换码</th>
                    <th>点数</th>
                    <th>描述</th>
                    <th>状态</th>
                    <th>创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="loading">加载中...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
          let currentUser = null;
          let stats = {};
          let users = [];
          let codes = [];

          async function checkAuth() {
            try {
              const response = await fetch('/api/admin/auth');
              if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                  currentUser = data.user;
                  document.getElementById('welcome').textContent = '欢迎, ' + currentUser.username;
                  loadDashboardData();
                } else {
                  window.location.href = '/admin-7654/standalone-login';
                }
              } else {
                window.location.href = '/admin-7654/standalone-login';
              }
            } catch (error) {
              console.error('检查认证失败:', error);
              window.location.href = '/admin-7654/standalone-login';
            }
          }

          async function loadDashboardData() {
            try {
              // 加载统计数据
              const statsResponse = await fetch('/api/admin/stats');
              if (statsResponse.ok) {
                stats = await statsResponse.json();
                renderStats();
              }

              // 加载用户数据
              const usersResponse = await fetch('/api/admin/users');
              if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                users = usersData.users || [];
                renderUsers();
              }

              // 加载兑换码数据
              const codesResponse = await fetch('/api/admin/redemption-codes');
              if (codesResponse.ok) {
                const codesData = await codesResponse.json();
                codes = codesData.codes || [];
                renderCodes();
              }
            } catch (error) {
              console.error('加载数据失败:', error);
            }
          }

          function renderStats() {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = \`
              <div class="stat-card">
                <div class="stat-number">\${stats.totalUsers || 0}</div>
                <div class="stat-label">总用户数</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">\${stats.totalTransactions || 0}</div>
                <div class="stat-label">总交易数</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">\${stats.totalPoints || 0}</div>
                <div class="stat-label">总点数</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">\${stats.activeUsers || 0}</div>
                <div class="stat-label">活跃用户</div>
              </div>
            \`;
          }

          function renderUsers() {
            const tbody = document.querySelector('#usersTable tbody');
            if (users.length === 0) {
              tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #6b7280;">暂无用户数据</td></tr>';
              return;
            }

            tbody.innerHTML = users.map(user => \`
              <tr>
                <td>
                  <div class="user-name">\${user.name || '未设置姓名'}</div>
                  <div class="user-email">\${user.email}</div>
                </td>
                <td>\${user.points || 0}</td>
                <td>
                  <span class="badge \${user.membership_type === 'premium' ? 'premium' : 'free'}">
                    \${user.membership_type === 'premium' ? '高级会员' : '普通用户'}
                  </span>
                </td>
                <td>\${new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
              </tr>
            \`).join('');
          }

          function renderCodes() {
            const tbody = document.querySelector('#codesTable tbody');
            if (codes.length === 0) {
              tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280;">暂无兑换码数据</td></tr>';
              return;
            }

            tbody.innerHTML = codes.map(code => \`
              <tr>
                <td style="font-family: monospace;">\${code.code}</td>
                <td>\${code.points}</td>
                <td>\${code.description}</td>
                <td>
                  <span class="badge \${code.is_used ? 'used' : 'available'}">
                    \${code.is_used ? '已使用' : '可用'}
                  </span>
                </td>
                <td>\${new Date(code.created_at).toLocaleDateString('zh-CN')}</td>
              </tr>
            \`).join('');
          }

          function switchTab(tabId) {
            // 移除所有活动状态
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            
            // 激活选中的标签和内容
            document.querySelector(\`[data-tab="\${tabId}"]\`).classList.add('active');
            document.getElementById(tabId).classList.add('active');
          }

          async function handleLogout() {
            try {
              await fetch('/api/admin/auth', { method: 'DELETE' });
              window.location.href = '/admin-7654/standalone-login';
            } catch (error) {
              console.error('退出登录失败:', error);
            }
          }

          async function createRedemptionCode() {
            const points = prompt('请输入点数:');
            const description = prompt('请输入描述:');
            
            if (points && description) {
              try {
                const response = await fetch('/api/admin/redemption-codes', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    points: Number(points),
                    description: description,
                    count: 1
                  }),
                });

                if (response.ok) {
                  alert('兑换码创建成功！');
                  loadDashboardData();
                } else {
                  alert('兑换码创建失败！');
                }
              } catch (error) {
                console.error('创建兑换码失败:', error);
                alert('创建兑换码失败！');
              }
            }
          }

          // 页面加载时检查认证
          document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            
            // 绑定事件
            document.querySelectorAll('.nav-tab').forEach(tab => {
              tab.addEventListener('click', function() {
                switchTab(this.dataset.tab);
              });
            });
            
            document.getElementById('logoutBtn').addEventListener('click', handleLogout);
            document.getElementById('createBtn').addEventListener('click', createRedemptionCode);
          });
        `
        }} />
      </body>
    </html>
  );
}