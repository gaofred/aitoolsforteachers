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
                    window.location.href = '/admin-dashboard.html';
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
