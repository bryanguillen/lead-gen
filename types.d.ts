// types.d.ts

declare module 'email-verify' {
  interface VerifyOptions {
    timeout?: number;
    port?: number;
  }

  interface VerifyInfo {
    success: boolean;
    info: string;
  }

  type Callback = (err: any, info: VerifyInfo) => void;

  function verify(email: string, options: VerifyOptions, callback: Callback): void;

  export = { verify };
}
