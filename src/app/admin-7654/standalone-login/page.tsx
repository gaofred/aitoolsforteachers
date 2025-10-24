export default function StandaloneAdminLoginPage() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>管理员登录</title>
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
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
          }
          
          .title {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
            color: #111827;
          }
          
          .subtitle {
            text-align: center;
            color: #6b7280;
            margin-bottom: 32px;
            font-size: 14px;
          }
          
          .form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
          }
          
          .label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 4px;
          }
          
          .input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
          }
          
          .input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          .error {
            padding: 8px 12px;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #dc2626;
            font-size: 14px;
            display: none;
          }
          
          .message {
            padding: 8px 12px;
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            color: #166534;
            font-size: 14px;
            display: none;
          }
          
          .button {
            width: 100%;
            padding: 12px;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
          
          .button:hover {
            background-color: #2563eb;
          }
          
          .button:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
          }
          
          .info {
            margin-top: 24px;
            padding: 16px;
            background-color: #f9fafb;
            border-radius: 6px;
            font-size: 12px;
            color: #6b7280;
          }
          
          .info-title {
            margin: 0 0 8px 0;
            font-weight: 500;
          }
          
          .info-item {
            margin: 0 0 4px 0;
          }
          
          .code {
            background-color: #e5e7eb;
            padding: 2px 4px;
            border-radius: 3px;
          }
        `
        }} />
      </head>
      <body>
        <div className="container">
          <h1 className="title">管理员登录</h1>
          <p className="subtitle">请输入管理员账号和密码</p>

          <form className="form" id="loginForm">
            <div className="form-group">
              <label className="label">用户名</label>
              <input
                type="text"
                id="username"
                className="input"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">密码</label>
              <input
                type="password"
                id="password"
                className="input"
                placeholder="请输入密码"
                required
              />
            </div>

            <div id="error" className="error"></div>
            <div id="message" className="message"></div>

            <button type="submit" className="button" id="submitBtn">
              登录
            </button>
          </form>

          <div className="info">
            <p className="info-title">可用账号:</p>
            <p className="info-item">
              用户名: <span className="code">fredgao_dhsl</span><br />
              密码: <span className="code">Seu10286</span>
            </p>
            <p className="info-item">
              用户名: <span className="code">admin</span><br />
              密码: <span className="code">admin-7654</span>
            </p>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('loginForm');
            const submitBtn = document.getElementById('submitBtn');
            const errorDiv = document.getElementById('error');
            const messageDiv = document.getElementById('message');

            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;
              
              // 清除之前的消息
              errorDiv.style.display = 'none';
              messageDiv.style.display = 'none';
              
              // 设置加载状态
              submitBtn.disabled = true;
              submitBtn.textContent = '登录中...';
              
              try {
                const response = await fetch('/api/admin/auth', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                  messageDiv.textContent = '登录成功！正在跳转...';
                  messageDiv.style.display = 'block';
                  setTimeout(() => {
                    window.location.href = '/admin-7654/standalone-dashboard';
                  }, 1000);
                } else {
                  errorDiv.textContent = data.error || '登录失败';
                  errorDiv.style.display = 'block';
                }
              } catch (error) {
                console.error('登录失败:', error);
                errorDiv.textContent = '登录失败，请稍后重试';
                errorDiv.style.display = 'block';
              } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '登录';
              }
            });
          });
        `
        }} />
      </body>
    </html>
  );
}