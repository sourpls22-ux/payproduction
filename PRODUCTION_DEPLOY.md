# 🚀 Деплой новой системы оплаты на продакшен

## ✅ Что готово для продакшена

### 🔧 Backend изменения:
- ✅ Новый webhook endpoint: `/api/webhooks/atlos-new`
- ✅ Новый endpoint для платежей: `/api/payments/atlos-new/start`
- ✅ Поле `channel` в таблице `payments` для разделения систем
- ✅ Идемпотентная обработка платежей
- ✅ Правильная верификация подписи ATLOS
- ✅ Улучшенное логирование

### 🎨 Frontend изменения:
- ✅ Обновленный CSP для ATLOS
- ✅ Тестовая кнопка скрыта на продакшене
- ✅ Использование нового endpoint для тестовых платежей

## 🚀 Инструкции для деплоя

### 1. На локальной машине

```bash
# Коммитим все изменения
git add .
git commit -m "feat: Add new ATLOS payment system for production

- Add separate webhook endpoint /api/webhooks/atlos-new
- Add new payment endpoint /api/payments/atlos-new/start  
- Add channel field to payments table
- Improve signature verification and logging
- Hide test button on production
- Update CSP for ATLOS"

# Пушим на GitHub
git push origin main
```

### 2. На продакшен сервере (VPS)

```bash
# Подключаемся к серверу
ssh kissblow@your-vps-ip

# Переходим в директорию проекта
cd /var/www/payproduction

# Получаем обновления
git pull origin main

# Устанавливаем зависимости (если нужно)
cd backend
npm install

# Проверяем переменные окружения
cat .env | grep ATLOS
# Должно быть:
# ATLOS_MERCHANT_ID=OAK1D092DB
# ATLOS_API_SECRET=<ваш_base64_секрет>

# Перезапускаем backend
pm2 restart kissblow-backend

# Проверяем статус
pm2 status
pm2 logs kissblow-backend --lines 10
```

### 3. Настройка ATLOS в панели

1. Зайдите в ATLOS Merchant Panel
2. Обновите Postback URL на: `https://kissblow.me/api/webhooks/atlos-new`
3. Сохраните настройки

### 4. Тестирование на продакшене

```bash
# На сервере - тестируем webhook
cd /var/www/payproduction
./test-webhook-production.sh

# Или вручную:
BODY='{"OrderId":"kissblow_new_1_123","Status":100,"PaidAmount":1,"OrderCurrency":"USD"}'
SECRET='<ВАШ_ATLOS_API_SECRET_base64>'
SIG=$(node -e "const c=require('crypto'); const s=process.argv[1]; const k=Buffer.from(s,'base64'); const b=process.argv[2]; const sig=c.createHmac('sha256',k).update(Buffer.from(b,'utf8')).digest('base64'); console.log(sig)" "$SECRET" "$BODY")

curl -v https://kissblow.me/api/webhooks/atlos-new \
  -H "Content-Type: application/json" \
  -H "signature: $SIG" \
  --data-binary "$BODY"
```

### 5. Проверка работы

```bash
# Проверяем логи
pm2 logs kissblow-backend --lines 50

# Проверяем базу данных
sqlite3 database.sqlite "SELECT * FROM payments WHERE channel='new' ORDER BY created_at DESC LIMIT 5;"

# Проверяем баланс пользователя
sqlite3 database.sqlite "SELECT id, name, balance FROM users WHERE id=1;"
```

## 🔍 Мониторинг

### Логи для отслеживания:
- `[ATLOS-NEW] Creating payment:` - создание платежа
- `[ATLOS-NEW] Signature OK` - успешная верификация webhook'а
- `[ATLOS-NEW] ✅ Credited user` - успешное зачисление баланса
- `[ATLOS-NEW] already completed — idempotent` - идемпотентность

### Проверка здоровья системы:
```bash
# Статус PM2
pm2 status

# Логи в реальном времени
pm2 logs kissblow-backend --lines 0

# Проверка webhook endpoint
curl -I https://kissblow.me/api/webhooks/atlos-new

# Проверка нового payment endpoint
curl -I https://kissblow.me/api/payments/atlos-new/start
```

## 🛡️ Безопасность

### CSP уже настроен:
- ✅ `script-src` включает `https://atlos.io`
- ✅ `connect-src` включает `https://atlos.io wss://atlos.io`
- ✅ `frame-src` включает `https://atlos.io`

### Nginx конфигурация:
Убедитесь, что в nginx.conf есть:
```nginx
location /api/ {
  proxy_pass http://127.0.0.1:5000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  proxy_set_header Host $host;
  proxy_read_timeout 60s;
}
```

## 🎯 Результат

После деплоя:
1. **Старая система** продолжает работать через `/api/topup` и `/api/webhooks/atlos`
2. **Новая система** работает через `/api/payments/atlos-new/start` и `/api/webhooks/atlos-new`
3. **Тестовая кнопка** скрыта на продакшене
4. **Webhook'и** обрабатываются надежно с правильной верификацией
5. **Баланс** обновляется идемпотентно

## 🆘 Troubleshooting

### Если webhook не работает:
1. Проверьте URL в ATLOS панели
2. Проверьте логи: `pm2 logs kissblow-backend`
3. Проверьте подпись: используйте `test-webhook-production.sh`

### Если платеж не создается:
1. Проверьте endpoint: `curl -I https://kissblow.me/api/payments/atlos-new/start`
2. Проверьте авторизацию
3. Проверьте логи создания платежа

### Если баланс не обновляется:
1. Проверьте webhook логи
2. Проверьте статус платежа в БД
3. Используйте resync: `/api/payments/resync?orderId=...`

---

**Готово к продакшену! 🚀**
