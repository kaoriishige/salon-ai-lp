import './globals.css';
import { Noto_Sans_JP, Noto_Serif_JP, Cormorant_Garamond } from 'next/font/google';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-noto-serif',
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata = {
  title: 'Salon de Beauty | くせ毛特化の髪質改善ヘアサロン',
  description: '東京メトロ表参道駅徒歩3分。長年のくせ毛、広がり、パサつきのお悩みを根本から解決。当サロン独自の髪質改善エステで、乾かすだけでまとまる美しい髪へ導きます。24時間対応のAIコンシェルジュがお悩みにお答えします。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSerifJP.variable} ${cormorantGaramond.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
