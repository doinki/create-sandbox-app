/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/jsx-props-no-spreading */

const Logo: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  return <img alt="Logo" src="/logo.png" {...props} />;
};

export default Logo;
