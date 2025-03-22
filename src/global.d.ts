declare module "*.png" {
  const value: any;
  export default value;
}

declare module '*.toml' {
  const value: string;
  export = value;
}

declare module 'worker-loader!*' {
  const Worker: any;
  export default Worker;
}