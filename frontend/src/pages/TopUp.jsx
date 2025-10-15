import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import SEOHead from '../components/SEOHead'

const TopUp = () => {
  const [amount, setAmount] = useState('')
  const [selectedQuickAmount, setSelectedQuickAmount] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { t } = useTranslation()
  const { error } = useToast()
  
  // Глобальная обработка ошибок Atlos WebSocket
  useEffect(() => {
    const handleAtlosError = (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('Cannot send data if the connection is not in the \'Connected\' State') ||
           event.error.message.includes('WebSocket connection') ||
           event.error.message.includes('atlos'))) {
        console.warn('Atlos WebSocket error (handled):', event.error.message)
        event.preventDefault() // Предотвращаем показ ошибки в консоли
      }
    }
    
    const handleUnhandledRejection = (event) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('Cannot send data if the connection is not in the \'Connected\' State') ||
           event.reason.message.includes('WebSocket connection') ||
           event.reason.message.includes('atlos'))) {
        console.warn('Atlos WebSocket promise rejection (handled):', event.reason.message)
        event.preventDefault() // Предотвращаем показ ошибки в консоли
      }
    }
    
    window.addEventListener('error', handleAtlosError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleAtlosError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  // Функция для ожидания загрузки Atlos
  const waitForAtlos = () => {
    return new Promise((resolve) => {
      if (window.atlos && window.atlos.Pay) {
        resolve(true)
      } else {
        const checkAtlos = setInterval(() => {
          if (window.atlos && window.atlos.Pay) {
            clearInterval(checkAtlos)
            resolve(true)
          }
        }, 100)
        
        // Таймаут через 5 секунд
        setTimeout(() => {
          clearInterval(checkAtlos)
          resolve(false)
        }, 5000)
      }
    })
  }

  // Функция для проверки состояния WebSocket соединения ATLOS (оптимизированная)
  const checkAtlosConnection = () => {
    return new Promise((resolve) => {
      if (!window.atlos) {
        resolve(false)
        return
      }
      
      // Проверяем различные состояния соединения
      const checkConnection = () => {
        try {
          // Пытаемся получить состояние соединения
          if (window.atlos._connection && window.atlos._connection.readyState === 1) {
            console.log('ATLOS WebSocket connection is ready (1)')
            resolve(true)
          } else if (window.atlos._ws && window.atlos._ws.readyState === 1) {
            console.log('ATLOS WebSocket connection is ready (2)')
            resolve(true)
          } else if (window.atlos._connection || window.atlos._ws) {
            console.log('ATLOS WebSocket connection not ready, waiting...')
            setTimeout(checkConnection, 200) // Уменьшаем с 500ms до 200ms
          } else {
            // Если не можем найти объекты соединения, считаем что готово
            console.log('ATLOS WebSocket objects not found, assuming ready')
            resolve(true)
          }
        } catch (error) {
          console.warn('Error checking ATLOS connection:', error)
          resolve(false)
        }
      }
      
      // Начинаем проверку сразу (убираем задержку в 1 секунду)
      checkConnection()
      
      // Таймаут через 3 секунды (уменьшаем с 10 секунд)
      setTimeout(() => {
        console.log('ATLOS connection check timeout')
        resolve(false)
      }, 3000)
    })
  }
  
  // Функция для вызова Atlos с проверкой соединения (оптимизированная)
  const callAtlosWithRetry = (paymentData, retries = 2) => { // Уменьшаем попытки с 3 до 2
    return new Promise(async (resolve, reject) => {
      const attemptCall = async (attempt) => {
        try {
          if (window.atlos && window.atlos.Pay) {
            console.log(`Attempting Atlos.Pay (attempt ${attempt + 1}/${retries + 1})`)
            
            // Проверяем состояние соединения
            const isConnected = await checkAtlosConnection()
            
            if (isConnected) {
              try {
                console.log('ATLOS connection verified, calling Pay method')
                window.atlos.Pay(paymentData)
                resolve(true)
              } catch (innerError) {
                console.warn(`Atlos.Pay failed (attempt ${attempt + 1}/${retries + 1}):`, innerError)
                if (attempt < retries) {
                  setTimeout(() => attemptCall(attempt + 1), 1000) // Уменьшаем с 3000ms до 1000ms
                } else {
                  reject(innerError)
                }
              }
            } else {
              console.warn(`Atlos connection not ready (attempt ${attempt + 1}/${retries + 1})`)
              if (attempt < retries) {
                setTimeout(() => attemptCall(attempt + 1), 1000) // Уменьшаем с 3000ms до 1000ms
              } else {
                reject(new Error('Atlos connection not ready after retries'))
              }
            }
          } else {
            throw new Error('Atlos not available')
          }
        } catch (error) {
          console.warn(`Atlos call failed (attempt ${attempt + 1}/${retries + 1}):`, error)
          if (attempt < retries) {
            setTimeout(() => attemptCall(attempt + 1), 1000) // Уменьшаем с 3000ms до 1000ms
          } else {
            reject(error)
          }
        }
      }
      attemptCall(0)
    })
  }

  // Функция для принудительного переподключения ATLOS (оптимизированная)
  const forceAtlosReconnect = () => {
    return new Promise((resolve) => {
      if (window.atlos && window.atlos._connection) {
        try {
          // Закрываем существующее соединение
          if (window.atlos._connection.close) {
            window.atlos._connection.close()
          }
          if (window.atlos._ws && window.atlos._ws.close) {
            window.atlos._ws.close()
          }
          console.log('ATLOS connection closed for reconnection')
        } catch (error) {
          console.warn('Error closing ATLOS connection:', error)
        }
      }
      
      // Ждем переподключения (уменьшаем с 2000ms до 500ms)
      setTimeout(() => {
        console.log('ATLOS reconnection delay completed')
        resolve(true)
      }, 500)
    })
  }
  
  // Варианты быстрого пополнения с скидками
  const quickAmounts = [
    { amount: 10, discount: 0, bonus: 0, label: '$10', description: 'No bonus' },
    { amount: 52.5, discount: 5, bonus: 2.5, label: '$52.50', description: '5% bonus' },
    { amount: 110, discount: 10, bonus: 10, label: '$110', description: '10% bonus' },
    { amount: 230, discount: 15, bonus: 30, label: '$230', description: '15% bonus' }
  ]
  
  // Только криптовалюта, убираем выбор метода
  
  // Обработка выбора быстрого пополнения
  const handleQuickAmountSelect = (quickAmount) => {
    setSelectedQuickAmount(quickAmount)
    setAmount(quickAmount.amount.toString())
  }
  
  // Обработка ручного ввода
  const handleAmountChange = (value) => {
    setAmount(value)
    setSelectedQuickAmount(null) // Сбрасываем выбор быстрого пополнения
  }
  
  // Расчет итоговой суммы с учетом скидки
  const getFinalAmount = () => {
    const baseAmount = parseFloat(amount) || 0
    if (selectedQuickAmount) {
      return baseAmount - selectedQuickAmount.bonus
    }
    return baseAmount
  }
  
  // Получение бонуса для отображения
  const getBonusAmount = () => {
    if (selectedQuickAmount) {
      return selectedQuickAmount.bonus
    }
    return 0
  }

  const handleTopUp = async () => {
    if (!amount || amount < 1) {
      error('Minimum top-up amount: $1')
      return
    }
    
    setIsProcessing(true)
    
    try {
      const finalAmount = getFinalAmount()
      const response = await axios.post('/api/topup', {
        amount: finalAmount, // Отправляем сумму к оплате (с учетом скидки)
        creditAmount: parseFloat(amount), // Сумма для зачисления на баланс
        method: 'crypto'
      })
      
      if (response.data.payment_data) {
        console.log('Payment data received:', response.data.payment_data)
        console.log('Payment URL:', response.data.payment_url)
        
        // Ждем загрузки Atlos
        const atlosReady = await waitForAtlos()
        
        if (atlosReady) {
          try {
            console.log('Atlos is ready, calling Atlos.Pay with data:', response.data.payment_data)
            
            // Принудительно переподключаемся для стабильности
            await forceAtlosReconnect()
            
            setTimeout(async () => {
              try {
                await callAtlosWithRetry(response.data.payment_data)
              } catch (retryError) {
                console.warn('Atlos widget failed after retries:', retryError)
                // Fallback to direct URL if Atlos widget fails
                console.log('Falling back to direct URL:', response.data.payment_url)
                window.open(response.data.payment_url, '_blank')
              }
            }, 1000) // Уменьшаем с 3000ms до 1000ms
          } catch (atlosError) {
            console.warn('Atlos widget error:', atlosError)
            // Fallback to direct URL if Atlos widget fails
            console.log('Falling back to direct URL:', response.data.payment_url)
            window.open(response.data.payment_url, '_blank')
          }
        } else {
          // Fallback to direct URL if Atlos not ready
          console.log('Atlos not ready after 5 seconds, using direct URL:', response.data.payment_url)
          window.open(response.data.payment_url, '_blank')
        }
      } else {
        console.error('No payment data received:', response.data)
        error('Payment data not received. Please try again.')
      }
    } catch (err) {
      console.error('Top up error:', err)
      error('Payment creation failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const seoData = {
    title: t('topUp.title'),
    description: t('topUp.subtitle'),
    keywords: 'top up, balance, payment, cryptocurrency, escort directory, KissBlow'
  }

  return (
    <>
      <SEOHead {...seoData} />
      <div className="min-h-screen theme-bg py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-onlyfans-accent hover:opacity-80 transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span>{t('topUp.backToDashboard')}</span>
              </Link>
              <h1 className="text-3xl font-bold theme-text mb-2">{t('topUp.title')}</h1>
              <p className="theme-text-secondary">{t('topUp.subtitle')}</p>
            </div>

        <div className="theme-surface rounded-lg p-6 border theme-border">

          {/* Быстрое пополнение */}
          <div className="mb-6">
            <h3 className="theme-text font-semibold mb-4">Quick Top-Up</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Первый ряд: $10 и $50 */}
              <button
                onClick={() => handleQuickAmountSelect(quickAmounts[0])}
                className={`p-5 rounded-lg transition-all text-left ${
                  selectedQuickAmount?.amount === quickAmounts[0].amount
                    ? 'bg-blue-500 bg-opacity-10'
                    : 'hover:bg-blue-500 hover:bg-opacity-5'
                }`}
                style={{
                  border: selectedQuickAmount?.amount === quickAmounts[0].amount 
                    ? '2px solid #3b82f6' 
                    : '2px solid #6b7280'
                }}
                onMouseEnter={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[0].amount) {
                    e.target.style.borderColor = '#3b82f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[0].amount) {
                    e.target.style.borderColor = '#6b7280'
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="theme-text font-semibold text-lg">$10.00</div>
                    <div className="theme-text-secondary text-sm">{quickAmounts[0].description}</div>
                  </div>
                  <div className="text-right">
                    {quickAmounts[0].bonus > 0 && (
                      <div className="text-green-500 font-semibold text-sm">
                        +${quickAmounts[0].bonus} bonus
                      </div>
                    )}
                    <div className="theme-text-secondary text-sm">
                      Get: {quickAmounts[0].label}
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleQuickAmountSelect(quickAmounts[1])}
                className={`p-5 rounded-lg transition-all text-left ${
                  selectedQuickAmount?.amount === quickAmounts[1].amount
                    ? 'bg-blue-500 bg-opacity-10'
                    : 'hover:bg-blue-500 hover:bg-opacity-5'
                }`}
                style={{
                  border: selectedQuickAmount?.amount === quickAmounts[1].amount 
                    ? '2px solid #3b82f6' 
                    : '2px solid #6b7280'
                }}
                onMouseEnter={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[1].amount) {
                    e.target.style.borderColor = '#3b82f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[1].amount) {
                    e.target.style.borderColor = '#6b7280'
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="theme-text font-semibold text-lg">$50.00</div>
                    <div className="theme-text-secondary text-sm">{quickAmounts[1].description}</div>
                  </div>
                  <div className="text-right">
                    {quickAmounts[1].bonus > 0 && (
                      <div className="text-green-500 font-semibold text-sm">
                        +${quickAmounts[1].bonus} bonus
                      </div>
                    )}
                    <div className="theme-text-secondary text-sm">
                      Get: {quickAmounts[1].label}
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Второй ряд: $100 и $200 */}
              <button
                onClick={() => handleQuickAmountSelect(quickAmounts[2])}
                className={`p-5 rounded-lg transition-all text-left ${
                  selectedQuickAmount?.amount === quickAmounts[2].amount
                    ? 'bg-blue-500 bg-opacity-10'
                    : 'hover:bg-blue-500 hover:bg-opacity-5'
                }`}
                style={{
                  border: selectedQuickAmount?.amount === quickAmounts[2].amount 
                    ? '2px solid #3b82f6' 
                    : '2px solid #6b7280'
                }}
                onMouseEnter={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[2].amount) {
                    e.target.style.borderColor = '#3b82f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[2].amount) {
                    e.target.style.borderColor = '#6b7280'
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="theme-text font-semibold text-lg">$100.00</div>
                    <div className="theme-text-secondary text-sm">{quickAmounts[2].description}</div>
                  </div>
                  <div className="text-right">
                    {quickAmounts[2].bonus > 0 && (
                      <div className="text-green-500 font-semibold text-sm">
                        +${quickAmounts[2].bonus} bonus
                      </div>
                    )}
                    <div className="theme-text-secondary text-sm">
                      Get: {quickAmounts[2].label}
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleQuickAmountSelect(quickAmounts[3])}
                className={`p-5 rounded-lg transition-all text-left ${
                  selectedQuickAmount?.amount === quickAmounts[3].amount
                    ? 'bg-blue-500 bg-opacity-10'
                    : 'hover:bg-blue-500 hover:bg-opacity-5'
                }`}
                style={{
                  border: selectedQuickAmount?.amount === quickAmounts[3].amount 
                    ? '2px solid #3b82f6' 
                    : '2px solid #6b7280'
                }}
                onMouseEnter={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[3].amount) {
                    e.target.style.borderColor = '#3b82f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedQuickAmount?.amount !== quickAmounts[3].amount) {
                    e.target.style.borderColor = '#6b7280'
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="theme-text font-semibold text-lg">$200.00</div>
                    <div className="theme-text-secondary text-sm">{quickAmounts[3].description}</div>
                  </div>
                  <div className="text-right">
                    {quickAmounts[3].bonus > 0 && (
                      <div className="text-green-500 font-semibold text-sm">
                        +${quickAmounts[3].bonus} bonus
                      </div>
                    )}
                    <div className="theme-text-secondary text-sm">
                      Get: {quickAmounts[3].label}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Сумма */}
          <div className="mb-6">
            <label className="block theme-text font-semibold mb-2">
              {t('topUp.amount')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="1.00"
                min="1"
                step="0.01"
                className="w-full pl-8 pr-4 py-3 theme-bg border theme-border rounded-lg theme-text placeholder-gray-400 focus:outline-none focus:border-onlyfans-accent focus:ring-2 focus:ring-onlyfans-accent"
              />
            </div>
            <p className="theme-text-secondary text-sm mt-2">{t('topUp.minAmount')}</p>
          </div>

          {/* Информация о платеже */}
          <div className="mb-6 p-4 theme-bg rounded-lg border theme-border">
            <h4 className="theme-text font-semibold mb-2">{t('topUp.paymentInfo')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="theme-text-secondary">Credit Amount</span>
                <span className="theme-text">${amount || '0.00'}</span>
              </div>
              {getBonusAmount() > 0 && (
                <div className="flex justify-between">
                  <span className="theme-text-secondary">Bonus</span>
                  <span className="text-green-500 font-semibold">+${getBonusAmount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="theme-text-secondary">{t('topUp.fee')}</span>
                <span className="theme-text">$0.00</span>
              </div>
              <div className="flex justify-between border-t theme-border pt-2">
                <span className="theme-text font-semibold">You Pay</span>
                <span className="text-onlyfans-accent font-semibold">${getFinalAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>

              {/* Кнопка пополнения */}
              <button
                onClick={handleTopUp}
                disabled={!amount || amount < 1 || isProcessing}
                className="w-full bg-onlyfans-accent text-white py-3 rounded-lg hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  t('topUp.topUpButton')
                )}
              </button>

              {/* Дополнительная информация */}
              <div className="mt-6 text-center">
                <p className="theme-text-secondary text-sm">
                  {t('topUp.securePayment')}
                </p>
                <p className="theme-text-secondary text-sm">
                  {t('topUp.support')}
                </p>
              </div>
        </div>
      </div>
      </div>
    </>
  )
}

export default TopUp
