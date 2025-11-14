'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

export default function OCRDiagnosticPage() {
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])

  const runOCRDiagnostic = async () => {
    setIsTestRunning(true)
    setTestResults([])

    // 创建测试图片数据
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

    try {
      console.log('🧪 开始OCR诊断测试...')

      // 监听网络请求
      const originalFetch = window.fetch
      const interceptedRequests: any[] = []

      window.fetch = function(input: any, init?: any) {
        const url = typeof input === 'string' ? input : input.url
        if (url.includes('mcs.zijieapi.com') || url.includes('zijieapi')) {
          interceptedRequests.push({
            url: url,
            timestamp: new Date().toISOString(),
            method: init?.method || 'GET'
          })
          console.warn('🚨 检测到 zijieapi 域名请求:', url)
        }
        return originalFetch(input, init)
      }

      // 发送OCR请求
      const response = await fetch('/api/ai/image-recognition-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: testImageData,
          async: false
        })
      })

      const result = await response.json()

      // 恢复原始fetch
      window.fetch = originalFetch

      setTestResults([
        {
          test: 'OCR API 调用',
          status: response.ok ? 'success' : 'failed',
          message: response.ok ? '✅ API调用成功' : `❌ API调用失败: ${response.status}`,
          details: result
        },
        {
          test: '第三方域名检测',
          status: interceptedRequests.length === 0 ? 'success' : 'warning',
          message: interceptedRequests.length === 0 ?
            '✅ 未检测到 zijieapi 相关请求' :
            `⚠️ 检测到 ${interceptedRequests.length} 个 zijieapi 相关请求`,
          details: interceptedRequests
        },
        {
          test: '浏览器环境',
          status: 'info',
          message: `🌐 User Agent: ${navigator.userAgent.substring(0, 50)}...`,
          details: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          }
        }
      ])

    } catch (error) {
      console.error('❌ 诊断测试失败:', error)
      setTestResults([{
        test: '诊断测试',
        status: 'failed',
        message: `❌ 测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error
      }])
    } finally {
      setIsTestRunning(false)
    }
  }

  const checkAdBlocker = () => {
    const testUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'

    fetch(testUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          alert('✅ 广告拦截器可能未启用')
        } else {
          alert('⚠️ 检测到广告拦截器或网络限制')
        }
      })
      .catch(() => {
        alert('⚠️ 检测到广告拦截器或网络限制')
      })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OCR 诊断工具</h1>
          <p className="text-gray-600">帮助诊断 OCR 功能中的网络问题和广告拦截器冲突</p>
        </div>

        {/* 问题说明 */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              mcs.zijieapi.com 错误说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>错误原因：</strong>mcs.zijieapi.com 域名被浏览器广告拦截器阻止
              </p>
              <p>
                <strong>解决方案：</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-orange-700">
                <li>暂时禁用广告拦截器（AdBlock、uBlock Origin等）</li>
                <li>将网站添加到广告拦截器白名单</li>
                <li>使用隐私模式或无痕浏览测试</li>
                <li>检查浏览器安全扩展设置</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* 测试按钮 */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={runOCRDiagnostic}
            disabled={isTestRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isTestRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              '运行 OCR 诊断'
            )}
          </Button>

          <Button
            onClick={checkAdBlocker}
            variant="outline"
          >
            检测广告拦截器
          </Button>
        </div>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">诊断结果</h2>
            {testResults.map((result, index) => (
              <Card key={index} className={
                result.status === 'success' ? 'border-green-200 bg-green-50' :
                result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                result.status === 'failed' ? 'border-red-200 bg-red-50' :
                'border-blue-200 bg-blue-50'
              }>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                    {result.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                    {result.status === 'failed' && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                    {result.status === 'info' && <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />}

                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{result.test}</h3>
                      <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                      {result.details && (
                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-800">查看详细信息</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 解决方案指南 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📋 解决方案指南</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">浏览器设置</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Chrome: 设置 → 隐私和安全 → 网站设置</li>
                  <li>• Firefox: 设置 → 隐私与安全</li>
                  <li>• Edge: 设置 → 隐私、搜索和服务</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">广告拦截器设置</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• AdBlock: 白名单添加你的域名</li>
                  <li>• uBlock Origin: 点击图标暂时禁用</li>
                  <li>• Privacy Badger: 在设置中放行</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}