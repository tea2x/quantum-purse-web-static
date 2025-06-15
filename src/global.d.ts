declare module "*.png" {
  const value: any;
  export default value;
}

declare module '*.toml' {
  const value: string;
  export = value;
}

declare module 'qrcode.react' {
  export const QRCodeSVG: ComponentType<QRCodeSVGProps>;
}