#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки новой системы оплаты
 * Запуск: node test-payment.js
 */

import axios from 'axios'

const BASE_URL = 'http://localhost:5000'
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123'
}

async function testPaymentFlow() {
  console.log('🧪 [TEST] Starting payment flow test...')
  
  try {
    // 1. Логинимся
    console.log('🧪 [TEST] Step 1: Login...')
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      turnstileToken: 'test-token' // Для локального тестирования
    })
    
    const token = loginResponse.data.token
    console.log('✅ [TEST] Login successful, token:', token.substring(0, 20) + '...')
    
    // 2. Создаем тестовый платеж
    console.log('🧪 [TEST] Step 2: Create test payment...')
    const paymentResponse = await axios.post(`${BASE_URL}/api/topup`, {
      amount: 1.0,
      creditAmount: 1.0,
      method: 'crypto',
      testMode: true,
      orderId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const orderId = paymentResponse.data.payment_id
    console.log('✅ [TEST] Payment created, orderId:', orderId)
    console.log('🧪 [TEST] Payment data:', paymentResponse.data)
    
    // 3. Тестируем завершение платежа
    console.log('🧪 [TEST] Step 3: Complete test payment...')
    const completeResponse = await axios.post(`${BASE_URL}/api/test-payment/${orderId}`, {
      action: 'complete'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ [TEST] Payment completed:', completeResponse.data)
    
    // 4. Проверяем баланс
    console.log('🧪 [TEST] Step 4: Check balance...')
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ [TEST] Current balance:', balanceResponse.data.balance)
    
    console.log('🎉 [TEST] All tests passed!')
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error.response?.data || error.message)
  }
}

// Запускаем тест
testPaymentFlow()
