# 🧪 Тестирование новой системы оплаты

## 📋 Что мы создали

### ✅ Новая тестовая кнопка оплаты
- **Зеленая кнопка "🧪 Test Payment (New System)"** в TopUp.jsx
- Расширенная диагностика с эмодзи-логами
- Поддержка тестового режима
- Улучшенные callback'и для отслеживания

### ✅ Обновленный backend
- Поддержка `testMode` и `customOrderId` в `/api/topup`
- Новый endpoint `/api/test-payment/:orderId` для тестирования
- Улучшенное логирование с эмодзи-префиксами
- Идемпотентная обработка платежей

### ✅ Тестовый скрипт
- `test-payment.js` - автоматическое тестирование всего flow'а
- Проверка логина, создания платежа, завершения и баланса

## 🚀 Как тестировать

### 1. Локальное тестирование

```bash
# Запустить приложение
npm run dev

# В другом терминале - запустить тест
node test-payment.js
```

### 2. Ручное тестирование в браузере

1. Откройте `http://localhost:3000/topup`
2. Введите сумму (например, $1)
3. Нажмите **зеленую кнопку "🧪 Test Payment (New System)"**
4. Откройте консоль браузера для просмотра логов
5. Проверьте логи в терминале backend'а

### 3. Тестирование на продакшене

```bash
# На VPS
cd /var/www/payproduction
git pull origin main
pm2 restart kissblow-backend

# Проверить логи
pm2 logs kissblow-backend --lines 20
```

## 🔍 Диагностика

### Логи в консоли браузера
- `🧪 [TEST PAYMENT]` - все действия тестового платежа
- `🧪 [TEST PAYMENT] ✅ Success callback triggered` - успешный callback
- `🧪 [TEST PAYMENT] ❌ Error callback triggered` - ошибка

### Логи в backend
- `🧪 [TOPUP]` - создание платежа
- `🧪 [CREATE PAYMENT]` - детали создания
- `🧪 [TEST PAYMENT]` - тестирование завершения
- `🧪 [TEST WEBHOOK]` - симуляция webhook'а

## 🎯 Что проверить

### ✅ Основной flow
1. **Создание платежа** - кнопка работает, платеж создается
2. **ATLOS SDK** - загружается и готов к работе
3. **Callback'и** - срабатывают при успехе/ошибке
4. **База данных** - платеж сохраняется с правильным статусом

### ✅ Тестовый flow
1. **Тестовая кнопка** - создает платеж с `testMode: true`
2. **Завершение платежа** - `/api/test-payment/:orderId` работает
3. **Обновление баланса** - баланс пользователя увеличивается
4. **Идемпотентность** - повторные вызовы не дублируют баланс

### ✅ Webhook flow
1. **ATLOS webhook** - приходит на `/api/webhooks/atlos`
2. **Подпись** - проверяется корректно
3. **Обработка** - платеж завершается и баланс обновляется
4. **Resync** - `/api/payments/resync` работает для проверки

## 🐛 Возможные проблемы

### ATLOS SDK не загружается
- Проверить CSP в `index.html`
- Проверить подключение к `https://atlos.io`
- Проверить консоль браузера на ошибки

### Webhook не приходит
- Проверить настройки в ATLOS панели
- Проверить URL: `https://kissblow.me/api/webhooks/atlos`
- Проверить firewall и доступность портов

### Баланс не обновляется
- Проверить логи webhook'а
- Проверить статус платежа в базе
- Использовать `/api/payments/resync` для принудительной проверки

## 📊 Мониторинг

### Проверка статуса
```bash
# PM2 статус
pm2 status

# Логи backend'а
pm2 logs kissblow-backend --lines 50

# Проверка базы данных
sqlite3 database.sqlite "SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;"
```

### Проверка webhook'ов
```bash
# Тестовый webhook
curl -X POST https://kissblow.me/api/test-payment/TEST_ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "complete"}'
```

## 🎉 Готово!

Новая система оплаты готова к тестированию! Используйте зеленую кнопку для тестирования и следите за логами для диагностики.
