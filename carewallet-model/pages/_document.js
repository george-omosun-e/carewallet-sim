import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#09090b" />
      </Head>
      <body style={{ margin: 0, padding: 0, background: "#09090b" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
