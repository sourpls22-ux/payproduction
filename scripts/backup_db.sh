#!/bin/bash

# Конфигурация
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/kissblow/backups"
DB_PATH="/var/www/payproduction/backend/database.sqlite"
BOT_TOKEN="7760908645:AAEZEDxzE14WEXtQk8AtgFzjNIhy6BuUXEc"
CHAT_ID="1119283257"

# Создать папку для бэкапов
mkdir -p $BACKUP_DIR

# Создать бэкап
if cp $DB_PATH "$BACKUP_DIR/database_$DATE.sqlite"; then
    # Сжать бэкап
    gzip "$BACKUP_DIR/database_$DATE.sqlite"
    
    # Отправить файл в Telegram
    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendDocument" \
         -F "chat_id=$CHAT_ID" \
         -F "document=@$BACKUP_DIR/database_$DATE.sqlite.gz" \
         -F "caption=🗄️ Бэкап БД KissBlow от $(date '+%d.%m.%Y %H:%M')"
    
    echo "✅ Бэкап создан и отправлен в Telegram: database_$DATE.sqlite.gz"
else
    # Отправить уведомление об ошибке
    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
         -d "chat_id=$CHAT_ID" \
         -d "text=❌ Ошибка создания бэкапа БД!"
    
    echo "❌ Ошибка создания бэкапа"
    exit 1
fi

# Удалить старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "database_*.sqlite.gz" -mtime +7 -delete

echo "🧹 Старые бэкапы удалены"
