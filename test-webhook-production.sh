#!/bin/bash

# Тестирование webhook'а на продакшене
# Использование: ./test-webhook-production.sh

echo "🧪 [TEST] Testing ATLOS webhook on production..."

# Настройки
DOMAIN="https://kissblow.me"
WEBHOOK_URL="$DOMAIN/api/webhooks/atlos-new"
ORDER_ID="kissblow_new_1_$(date +%s)"

# Получить секрет из переменных окружения (на сервере)
if [ -z "$ATLOS_API_SECRET" ]; then
    echo "❌ [TEST] ATLOS_API_SECRET not found in environment"
    echo "Please set ATLOS_API_SECRET in your environment"
    exit 1
fi

# Тестовые данные
BODY='{"OrderId":"'$ORDER_ID'","Status":100,"PaidAmount":1,"OrderCurrency":"USD"}'

echo "🧪 [TEST] Order ID: $ORDER_ID"
echo "🧪 [TEST] Body: $BODY"

# Генерируем подпись
SIG=$(node -e "
const crypto = require('crypto');
const secret = process.argv[1];
const body = process.argv[2];
const key = Buffer.from(secret, 'base64');
const signature = crypto.createHmac('sha256', key).update(Buffer.from(body, 'utf8')).digest('base64');
console.log(signature);
" "$ATLOS_API_SECRET" "$BODY")

echo "🧪 [TEST] Generated signature: $SIG"

# Отправляем webhook
echo "🧪 [TEST] Sending webhook to: $WEBHOOK_URL"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "signature: $SIG" \
  --data-binary "$BODY")

# Разделяем ответ и код
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "🧪 [TEST] HTTP Code: $HTTP_CODE"
echo "🧪 [TEST] Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ [TEST] Webhook test successful!"
else
    echo "❌ [TEST] Webhook test failed!"
    exit 1
fi

echo "🧪 [TEST] Check server logs for detailed processing:"
echo "pm2 logs kissblow-backend --lines 20"
