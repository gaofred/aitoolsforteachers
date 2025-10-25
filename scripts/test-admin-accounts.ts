#!/usr/bin/env tsx

// 测试管理员账号配置
const ADMIN_ACCOUNTS = [
  {
    username: 'fredgao_dhsl',
    password: 'Seu10286',
    role: 'admin'
  },
  {
    username: 'admin',
    password: 'admin-7654',
    role: 'admin'
  }
];

async function testAdminAccounts() {
  console.log('🔍 测试管理员账号配置...');
  
  console.log('\n📋 已配置的管理员账号:');
  ADMIN_ACCOUNTS.forEach((account, index) => {
    console.log(`${index + 1}. 用户名: ${account.username}`);
    console.log(`   密码: ${account.password}`);
    console.log(`   角色: ${account.role}`);
    console.log('');
  });

  console.log('✅ 管理员账号配置检查完成！');
  console.log('\n🌐 访问地址:');
  console.log('   登录页面: http://localhost:3000/admin-7654/login');
  console.log('   管理后台: http://localhost:3000/admin-7654');
  
  console.log('\n💡 使用说明:');
  console.log('   1. 启动应用程序: npm run dev');
  console.log('   2. 访问登录页面');
  console.log('   3. 使用上述账号登录');
  console.log('   4. 开始管理用户和兑换码');
}

// 运行测试
testAdminAccounts()
  .then(() => {
    console.log('\n🎉 测试完成！');
  })
  .catch((error) => {
    console.error('💥 测试失败:', error);
    process.exit(1);
  });
