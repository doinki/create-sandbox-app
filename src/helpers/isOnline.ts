import { execSync } from 'node:child_process';
import { lookup } from 'node:dns';

const getProxy = (): string | undefined => {
  if (process.env.https_proxy) {
    return process.env.https_proxy;
  }

  try {
    const httpsProxy = execSync('npm config get https-proxy').toString().trim();
    return httpsProxy !== 'null' ? httpsProxy : undefined;
  } catch {
    return undefined;
  }
};

const isOnline = (): Promise<boolean> => {
  return new Promise((resolve) => {
    lookup('registry.yarnpkg.com', (err) => {
      if (!err) {
        resolve(true);
        return;
      }

      const proxy = getProxy();
      if (!proxy) {
        resolve(false);
        return;
      }

      const { hostname } = new URL(proxy);
      if (!hostname) {
        resolve(false);
        return;
      }

      lookup(hostname, (err) => {
        resolve(err == null);
      });
    });
  });
};

export default isOnline;
