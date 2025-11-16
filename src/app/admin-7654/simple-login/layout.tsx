export default function SimpleLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>管理员登录</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}


