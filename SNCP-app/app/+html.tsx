import React, { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>柠芯食伴 - 膳食营养助手</title>
        <meta
          name="description"
          content="面向中老年与慢病人群的饮食记录、营养分析与个性化推荐助手。"
        />
        <meta name="keywords" content="膳食记录,营养分析,健康提醒,食谱推荐,适老化" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* iOS Web Clip（添加到主屏幕后全屏打开） */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="柠芯食伴" />

        {/* Android/Chrome 等 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="format-detection" content="telephone=no" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

