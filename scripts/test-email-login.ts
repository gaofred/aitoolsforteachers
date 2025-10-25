import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function testEmailLogin() {
  console.log('🧪 测试邮箱登录功能...');

  const supabase = createServerSupabaseClient();

  try {
    // 测试用户登录
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';

    console.log(`📧 尝试登录: ${testEmail}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (error) {
      console.error('❌ 登录失败:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 提示: 用户不存在或密码错误，请先注册用户');
      }
      
      return;
    }

    if (data.user && data.session) {
      console.log('✅ 登录成功!');
      console.log('👤 用户信息:', {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: data.user.email_confirmed_at != null
      });

      // 测试获取用户数据
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          user_points (*),
          memberships (*)
        `)
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.log('⚠️ 获取用户扩展数据失败:', userError.message);
        console.log('💡 这可能是正常的，如果用户刚刚注册');
      } else {
        console.log('✅ 用户扩展数据:', userData);
      }

      // 登出
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('❌ 登出失败:', signOutError.message);
      } else {
        console.log('✅ 登出成功');
      }

    } else {
      console.error('❌ 登录失败: 没有返回用户数据');
    }

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testEmailLogin()
    .then(() => {
      console.log('🎉 邮箱登录测试完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 测试失败:', error);
      process.exit(1);
    });
}

export { testEmailLogin };









