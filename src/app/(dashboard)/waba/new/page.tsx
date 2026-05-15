'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

type WabaDetails = { waba_id?: string; business_id?: string } | null

export default function Onboarding() {
  const [selectedRegion, setSelectedRegion] = useState('India')
  const [phoneOption, setPhoneOption] = useState('exophone')
  const [selectedNumber, setSelectedNumber] = useState('')
  const [wabaDetails, setWabaDetails] = useState<WabaDetails>(null)

  // Facebook login callback
  const whatsAppLoginCallback = (response: any) => {
    console.log('📞 Login callback response:', response)
    console.log('Waba Details', wabaDetails)
  }
  console.log('Waba Details outside', wabaDetails)

  // Load and initialize Facebook SDK
  useEffect(() => {
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
    (window as any).fbAsyncInit = function () {
      const FB = (window as any).FB
      FB?.init?.({
        appId: '1914201879222931',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0',
      })
    }
  }, [])

  // Listen for WABA Embedded Signup completion and extract wabaId
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
          console.log('✅ WABA setup finished:', data.data)
          setWabaDetails({
            waba_id: data.data.waba_id,
          })
        }
      } catch (err) {
        console.error('❌ Failed to parse message:', err)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])


  useEffect(() => {
    console.log('Waba Details inside useEffect', wabaDetails)
    if (wabaDetails?.waba_id && wabaDetails?.business_id) {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        console.error('No access token found in localStorage')
        return
      }
      axios
        .post(
          'https://consoledevapinew.surefy.co/v1/admin/waba/onboard',
          {
            waba_id: wabaDetails.waba_id
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
        .then((response) => {
          const { message, data } = response.data
          console.log('WABA setup API response:', response.data)
          console.log('Message:', message)
          console.log('Data:', data)
        })
        .catch((error) => {
          console.error('WABA setup API error:', error)
        })
    }
  }, [wabaDetails])

  const handleFacebookLogin = () => {
    const FB = (window as any).FB
    if (!FB || typeof FB.login !== 'function') {
      alert('Facebook SDK not loaded')
      return
    }
    FB.login(whatsAppLoginCallback, {
      config_id: '25221069210862852',
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        sessionInfoVersion: '3',
        feature: 'whatsapp_embedded_signup',
        setup: {
          business: {
            isWebsiteRequired: false,
            name: '',
            email: '',
            phone: { code: 91, number: '' },
            address: {
              streetAddress1: '',
              city: '',
              state: '',
              zipPostal: '',
              country: 'IN',
            },
            timezone: 'Asia/Kolkata',
          },
          phone: {
            displayName: '',
            category: 'BUSINESS',
            description: '',
          },
        },
      },
    })
  }


  return (
    <div className="flex flex-col h-screen">
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Activate your phone number with WhatsApp Business API.
          </h1>
          <p className="text-gray-600">
            To continue, you need to have access to your Facebook Business Manager account. You can also{' '}
            <a href="#" className="text-blue-500 underline hover:text-blue-600">
              create a new account
            </a>
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Storage Option</h2>
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="India">🇮🇳 India</option>
                    <option value="USA">🇺🇸 USA</option>
                    <option value="UK">🇬🇧 UK</option>
                    <option value="Singapore">🇸🇬 Singapore</option>
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Select a data storage region to control where your message data is stored at rest. With Local Storage enabled, message content is automatically deleted from Meta's global servers after processing and retained only in the chosen region, ensuring compliance with local data protection regulations.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a phone number to register with WhatsApp.
                </h2>
                <p className="text-gray-600 mb-6">
                  The phone number should be able to receive an OTP via SMS or Voice Call
                </p>

                <div className="space-y-4 mb-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="phoneOption"
                      value="exophone"
                      checked={phoneOption === 'exophone'}
                      onChange={(e) => setPhoneOption(e.target.value)}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-blue-600 font-medium">Use Your Own Number</span>
                  </label>
                </div>

                {phoneOption === 'exophone' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Exophone</label>
                    <div className="relative">
                      <select
                        value={selectedNumber}
                        onChange={(e) => setSelectedNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-500"
                      >
                        <option value="">select number</option>
                        <option value="+919876543210">+91 9876543210</option>
                        <option value="+918765432109">+91 8765432109</option>
                        <option value="+917654321098">+91 7654321098</option>
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-800">Onboarding a number will incur a monthly platform rental charge, proceed only if required.</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start">
                  <UserIcon className="w-6 h-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 mb-3">To continue, you will need to access your company's Facebook business account. By clicking the "Login with Facebook" button below, you can:</p>
                    <ul className="text-sm text-green-800 space-y-2">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Create new or select existing Facebook and WhatsApp business accounts.
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Provide a display name and description for your WhatsApp business profile.
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        Connect and verify your phone number to use for WhatsApp API access.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-teal-600 rounded-lg p-8 text-white text-center">
                <h3 className="text-xl font-semibold mb-4">Onboarding businesses to the WhatsApp Business API just got easier</h3>
                <div className="bg-white bg-opacity-20 rounded-lg p-8 mb-4">
                  <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm mb-4">
                  <span className="text-blue-200 underline cursor-pointer">Watch this video for a walkthrough of the onboarding process</span>
                </p>
                <div className="text-right">
                  <svg className="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">BACK</Link>
          <button onClick={handleFacebookLogin} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Login with Facebook</button>
        </div>
      </div>
    </div>
  )
}