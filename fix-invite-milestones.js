/**
 * 邀请里程碑修复脚本
 * 直接使用数据库连接修复里程碑数据
 */

const { createClient } = require('@supabase/supabase-js')

// 从环境变量获取数据库URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixInviteSystem() {
  console.log('开始修复邀请系统...')

  try {
    // 1. 检查当前里程碑数据
    console.log('1. 检查里程碑表...')
    const { data: existingMilestones, error: milestoneError } = await supabase
      .from('invitation_milestones')
      .select('*')

    if (milestoneError) {
      console.error('里程碑表错误:', milestoneError)
    } else {
      console.log('现有里程碑:', existingMilestones?.length || 0)
    }

    // 2. 插入里程碑数据
    console.log('2. 插入里程碑数据...')
    const milestones = [
      {
        threshold: 10,
        bonus_points: 100,
        description: '成功邀请10位朋友',
        is_active: true
      },
      {
        threshold: 20,
        bonus_points: 300,
        description: '成功邀请20位朋友',
        is_active: true
      }
    ]

    for (const milestone of milestones) {
      const { data, error } = await supabase
        .from('invitation_milestones')
        .upsert(milestone, {
          onConflict: 'threshold'
        })
        .select()

      if (error) {
        console.error(`插入里程碑 ${milestone.threshold} 失败:`, error)
      } else {
        console.log(`里程碑 ${milestone.threshold} 插入成功:`, data)
      }
    }

    // 3. 验证结果
    console.log('3. 验证结果...')
    const { data: finalMilestones, error: finalError } = await supabase
      .from('invitation_milestones')
      .select('*')
      .order('threshold')

    if (finalError) {
      console.error('验证失败:', finalError)
    } else {
      console.log('最终里程碑数据:')
      finalMilestones.forEach(m => {
        console.log(`- ${m.threshold}人: ${m.bonus_points}点 (${m.description})`)
      })
    }

    // 4. 检查邀请奖励配置
    console.log('4. 检查邀请奖励配置...')
    const { data: rewards, error: rewardsError } = await supabase
      .from('invitation_rewards')
      .select('*')
      .single()

    if (rewardsError) {
      console.error('奖励配置错误:', rewardsError)
    } else {
      console.log('奖励配置:', rewards)
    }

    console.log('修复完成!')

  } catch (error) {
    console.error('修复过程中出错:', error)
  }
}

fixInviteSystem()