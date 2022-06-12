import { execSync } from 'node:child_process';
import { lookup } from 'node:dns';

const getProxy = () => {
  if (process.env.https_proxy) {
    return process.env.https_proxy;
  }

  try {
    const httpsProxy = execSync('npm config get https-proxy').toString().trim();
    return httpsProxy !== 'null' ? httpsProxy : undefined;
  } catch {}
};

const isOnline = (): Promise<boolean> => {
  return new Promise((resolve) => {
    lookup('registry.yarnpkg.com', (err) => {
      if (!err) {
        return resolve(true);
      }

      const proxy = getProxy();
      if (!proxy) {
        return resolve(false);
      }

      const { hostname } = new URL(proxy);
      if (!hostname) {
        return resolve(false);
      }

      lookup(hostname, (err) => {
        resolve(err === null);
      });
    });
  });
};

export default isOnline;
