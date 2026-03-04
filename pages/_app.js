import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Carewallet × Clinic Chain — Business Case</title>
        <meta name="description" content="Carewallet clinic chain partnership business case model" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
