import './globals.css'
import { Cairo } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'sonner'

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'] })

export const metadata = {
  title: 'DZ Store - متجرك الإلكتروني',
  description: 'متجر إلكتروني للدفع عند الاستلام في الجزائر',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className={cairo.className}>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  )
}
