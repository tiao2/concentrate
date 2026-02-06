// 缓存名称
const CACHE_NAME = 'focus-monitor-v2';
const STATIC_CACHE_NAME = 'focus-monitor-static-v2';

// 需要缓存的资源
const STATIC_RESOURCES = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker 安装中...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('缓存静态资源');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('所有资源缓存完成');
        return self.skipWaiting();
      })
  );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker 激活中...');
  
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker 激活完成');
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  // 对于安装按钮的请求，使用网络优先策略
  if (event.request.url.includes('/install')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 对于其他请求，使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，返回缓存
        if (response) {
          return response;
        }
        
        // 否则从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查是否有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应
            const responseToCache = response.clone();
            
            // 将响应添加到缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('获取失败:', error);
            // 对于 HTML 页面，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 后台同步（如果浏览器支持）
self.addEventListener('sync', event => {
  if (event.tag === 'sync-settings') {
    console.log('后台同步设置数据');
    event.waitUntil(syncSettings());
  }
});

// 推送通知处理
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || '专注学习提醒',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    tag: 'focus-push-notification',
    data: data.url || './index.html',
    actions: [
      { action: 'open', title: '打开应用' },
      { action: 'close', title: '关闭' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '专注学习监督器', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // 如果已经有打开的窗口，聚焦它
          for (const client of clientList) {
            if (client.url === './index.html' && 'focus' in client) {
              return client.focus();
            }
          }
          
          // 否则打开新窗口
          if (clients.openWindow) {
            return clients.openWindow('./index.html');
          }
        })
    );
  }
});

// 同步设置函数
function syncSettings() {
  // 这里可以添加与服务器同步设置的逻辑
  return Promise.resolve();
}

// 处理离线分析数据
function processOfflineData() {
  // 这里可以处理离线时收集的数据
  return Promise.resolve();
}
