import './globals.css';
import { PropsWithChildren } from 'react';
import { Providers } from './providers';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
