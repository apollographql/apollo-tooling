import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

// declare module "node-fetch" {
//   export function fetch(
//     input?: RequestInfo,
//     init?: RequestInit
//   ): Promise<Response>;
// }

export type RequestAgent = HttpAgent | HttpsAgent;

// export type RequestInfo = Request | string;

// export type HeadersInit = Headers | string[][] | { [name: string]: string };

// export declare class Body {
//   readonly bodyUsed: boolean;
//   arrayBuffer(): Promise<ArrayBuffer>;
//   json(): Promise<any>;
//   text(): Promise<string>;
// }

// export interface RequestInit {
//   method?: string;
//   headers?: HeadersInit;
//   body?: BodyInit;
//   mode?: RequestMode;
//   credentials?: RequestCredentials;
//   cache?: RequestCache;
//   redirect?: RequestRedirect;
//   referrer?: string;
//   referrerPolicy?: ReferrerPolicy;
//   integrity?: string;

//   // The following properties are node-fetch extensions
//   follow?: number;
//   timeout?: number;
//   compress?: boolean;
//   size?: number;
//   agent?: RequestAgent | false;

//   // Cloudflare Workers accept a `cf` property to control Cloudflare features
//   // See https://developers.cloudflare.com/workers/reference/cloudflare-features/
//   cf?: {
//     [key: string]: any;
//   };
// }

// export type RequestMode = "navigate" | "same-origin" | "no-cors" | "cors";

// export type RequestCredentials = "omit" | "same-origin" | "include";

// export type RequestCache =
//   | "default"
//   | "no-store"
//   | "reload"
//   | "no-cache"
//   | "force-cache"
//   | "only-if-cached";

// export type RequestRedirect = "follow" | "error" | "manual";

export type ReferrerPolicy =
  | ""
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "same-origin"
  | "origin"
  | "strict-origin"
  | "origin-when-cross-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url";

// export interface ResponseInit {
//   headers?: HeadersInit;
//   status?: number;
//   statusText?: string;
//   // Although this isn't part of the spec, `node-fetch` accepts a `url` property
//   url?: string;
// }

// export type BodyInit = ArrayBuffer | ArrayBufferView | string;

export {
  default as fetch,
  Request,
  Response,
  Headers,
  ResponseInit,
  BodyInit,
  RequestInfo,
  HeadersInit,
  Body,
  RequestInit,
  RequestMode,
  RequestCredentials,
  RequestCache,
  RequestRedirect
} from "node-fetch";
