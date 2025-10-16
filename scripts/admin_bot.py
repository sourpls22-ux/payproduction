#!/usr/bin/env python3
import sqlite3
import requests
import os
from datetime import datetime

# Конфигурация
BOT_TOKEN = "7760908645:AAEZEDxzE14WEXtQk8AtgFzjNIhy6BuUXEc"
ADMIN_CHAT_ID = "1119283257"  # Ваш Chat ID
DB_PATH = "/var/www/payproduction/backend/database.sqlite"

def send_message(chat_id, text):
    """Отправить сообщение в Telegram"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML'
    }
    try:
        response = requests.post(url, data=payload, timeout=10)
        return response.json()
    except Exception as e:
        print(f"Ошибка отправки сообщения: {e}")
        return None

def get_db_connection():
    """Подключение к базе данных"""
    return sqlite3.connect(DB_PATH)

def delete_user(user_id):
    """Удалить пользователя"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Удалить профили пользователя
        cursor.execute("DELETE FROM profiles WHERE user_id = ?", (user_id,))
        profiles_deleted = cursor.rowcount
        
        # Удалить платежи пользователя
        cursor.execute("DELETE FROM payments WHERE user_id = ?", (user_id,))
        payments_deleted = cursor.rowcount
        
        # Удалить пользователя
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        user_deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        if user_deleted > 0:
            return f"✅ Пользователь {user_id} удален\n🗑️ Профилей удалено: {profiles_deleted}\n💳 Платежей удалено: {payments_deleted}"
        else:
            return f"❌ Пользователь {user_id} не найден"
            
    except Exception as e:
        return f"❌ Ошибка удаления: {str(e)}"

def change_balance(user_id, new_balance):
    """Изменить баланс пользователя"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
        conn.commit()
        
        if cursor.rowcount > 0:
            conn.close()
            return f"✅ Баланс пользователя {user_id} изменен на ${new_balance}"
        else:
            conn.close()
            return f"❌ Пользователь {user_id} не найден"
            
    except Exception as e:
        return f"❌ Ошибка изменения баланса: {str(e)}"

def list_users():
    """Список пользователей"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, email, balance, created_at FROM users ORDER BY id DESC LIMIT 10")
        users = cursor.fetchall()
        conn.close()
        
        if users:
            result = "👥 <b>Последние 10 пользователей:</b>\n\n"
            for user in users:
                result += f"ID: {user[0]}\nEmail: {user[1]}\nБаланс: ${user[2]}\nДата: {user[3]}\n\n"
            return result
        else:
            return "❌ Пользователи не найдены"
            
    except Exception as e:
        return f"❌ Ошибка получения списка: {str(e)}"

def get_stats():
    """Статистика сайта"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Количество пользователей
        cursor.execute("SELECT COUNT(*) FROM users")
        users_count = cursor.fetchone()[0]
        
        # Количество профилей
        cursor.execute("SELECT COUNT(*) FROM profiles")
        profiles_count = cursor.fetchone()[0]
        
        # Общий баланс
        cursor.execute("SELECT SUM(balance) FROM users")
        total_balance = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return f"""📊 <b>Статистика KissBlow:</b>

👥 Пользователей: {users_count}
👤 Профилей: {profiles_count}
💰 Общий баланс: ${total_balance}
🕐 Время: {datetime.now().strftime('%d.%m.%Y %H:%M')}"""
        
    except Exception as e:
        return f"❌ Ошибка получения статистики: {str(e)}"

def process_command(message_text, chat_id):
    """Обработка команд"""
    # Показываем Chat ID для отладки
    if message_text == "/debug":
        return f"Ваш Chat ID: {chat_id}"
    
    # Убираем проверку Chat ID для тестирования
    # if chat_id != ADMIN_CHAT_ID:
    #     return "❌ Доступ запрещен"
    
    parts = message_text.split()
    command = parts[0].lower()
    
    if command == "/start":
        return """🤖 <b>KissBlow Admin Bot</b>

<b>Доступные команды:</b>
/start - Показать это меню
/stats - Статистика сайта
/users - Список пользователей
/delete_user [ID] - Удалить пользователя
/balance [ID] [СУММА] - Изменить баланс
/debug - Показать Chat ID

<b>Примеры:</b>
/delete_user 123
/balance 123 100"""
    
    elif command == "/stats":
        return get_stats()
    
    elif command == "/users":
        return list_users()
    
    elif command == "/delete_user":
        if len(parts) < 2:
            return "❌ Укажите ID пользователя: /delete_user 123"
        try:
            user_id = int(parts[1])
            return delete_user(user_id)
        except ValueError:
            return "❌ ID должен быть числом"
    
    elif command == "/balance":
        if len(parts) < 3:
            return "❌ Укажите ID и сумму: /balance 123 100"
        try:
            user_id = int(parts[1])
            balance = float(parts[2])
            return change_balance(user_id, balance)
        except ValueError:
            return "❌ ID и сумма должны быть числами"
    
    else:
        return "❌ Неизвестная команда. Используйте /start для списка команд"

def main():
    """Основная функция"""
    print("🤖 KissBlow Admin Bot запущен...")
    
    # Получить последние обновления
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    offset = 0
    
    while True:
        try:
            response = requests.get(url, params={'offset': offset, 'timeout': 30})
            data = response.json()
            
            if data['ok'] and data['result']:
                for update in data['result']:
                    offset = update['update_id'] + 1
                    
                    if 'message' in update:
                        message = update['message']
                        chat_id = message['chat']['id']
                        text = message.get('text', '')
                        
                        if text.startswith('/'):
                            result = process_command(text, chat_id)
                            send_message(chat_id, result)
            
        except Exception as e:
            print(f"Ошибка: {e}")
            import time
            time.sleep(5)

if __name__ == "__main__":
    main()
