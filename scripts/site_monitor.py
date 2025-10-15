#!/usr/bin/env python3
import requests
import time

# Конфигурация
URL = 'https://kissblow.me'
BOT_TOKEN = '7760908645:AAEZEDxzE14WEXtQk8AtgFzjNIhy6BuUXEc'
CHAT_ID = '1119283257'
CHECK_INTERVAL = 300  # 5 минут

def send_telegram_alert(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        'chat_id': CHAT_ID,
        'text': message
    }
    try:
        response = requests.post(url, data=payload, timeout=10)
        print(f"✅ Сообщение отправлено: {message}")
    except Exception as e:
        print(f"❌ Ошибка отправки: {e}")

def check_site():
    try:
        response = requests.get(URL, timeout=10)
        if response.status_code == 200:
            print(f"✅ {URL} доступен")
        else:
            send_telegram_alert(f"⚠️ Сайт {URL} недоступен! Код: {response.status_code}")
    except Exception as e:
        send_telegram_alert(f"❌ Сайт {URL} недоступен! Ошибка: {str(e)}")

if __name__ == "__main__":
    print("🚀 Запуск мониторинга KissBlow...")
    while True:
        check_site()
        time.sleep(CHECK_INTERVAL)
