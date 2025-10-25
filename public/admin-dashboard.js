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
                window.location.href = '/admin-login.html';
            }
        } else {
            window.location.href = '/admin-login.html';
        }
    } catch (error) {
        console.error('检查认证失败:', error);
        window.location.href = '/admin-login.html';
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
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.totalUsers || 0}</div>
            <div class="stat-label">总用户数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.totalTransactions || 0}</div>
            <div class="stat-label">总交易数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.totalPoints || 0}</div>
            <div class="stat-label">总点数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.activeUsers || 0}</div>
            <div class="stat-label">活跃用户</div>
        </div>
    `;
}

function renderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #6b7280;">暂无用户数据</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="font-weight: 500; color: #111827;">${user.name || '未设置姓名'}</div>
                <div style="font-size: 12px; color: #6b7280;">${user.email}</div>
            </td>
            <td>${user.points || 0}</td>
            <td>
                <span class="badge ${user.membership_type === 'premium' ? 'premium' : 'free'}">
                    ${user.membership_type === 'premium' ? '高级会员' : '普通用户'}
                </span>
            </td>
            <td>${new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
        </tr>
    `).join('');
}

function renderCodes() {
    const tbody = document.querySelector('#codesTable tbody');
    if (codes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280;">暂无兑换码数据</td></tr>';
        return;
    }

    tbody.innerHTML = codes.map(code => `
        <tr>
            <td style="font-family: monospace;">${code.code}</td>
            <td>${code.points}</td>
            <td>${code.description}</td>
            <td>
                <span class="badge ${code.is_used ? 'used' : 'available'}">
                    ${code.is_used ? '已使用' : '可用'}
                </span>
            </td>
            <td>${new Date(code.created_at).toLocaleDateString('zh-CN')}</td>
        </tr>
    `).join('');
}

function switchTab(tabId) {
    // 移除所有活动状态
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    
    // 激活选中的标签和内容
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

async function handleLogout() {
    try {
        await fetch('/api/admin/auth', { method: 'DELETE' });
        window.location.href = '/admin-login.html';
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
