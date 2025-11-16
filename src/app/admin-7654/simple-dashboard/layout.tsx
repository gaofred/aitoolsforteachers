export default function SimpleDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>管理员控制台</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}


