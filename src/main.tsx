import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { WagmiProvider } from 'wagmi'
import { config } from './web3/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GoogleReCaptchaProvider reCaptchaKey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"> {/* TEST KEY, Replace in Prod */}
          <App />
        </GoogleReCaptchaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
