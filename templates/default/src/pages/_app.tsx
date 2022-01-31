import 'normalize.css';
import '@/styles/global.css';

import type { AppProps } from 'next/app';
import { DefaultSeo } from 'next-seo';

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <DefaultSeo title="Sandbox" />
      <Component {...pageProps} />
    </>
  );
};

export default MyApp;
