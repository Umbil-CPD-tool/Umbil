import { API_PATHS } from "../constants/routes";

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
};

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Guest / device rate-limit header used by the web app. */
  deviceId?: string;
};

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const trimSlash = (url: string) => url.replace(/\/$/, "");

export const createApiClient = ({ baseUrl, getAccessToken }: ApiClientConfig) => {
  const root = trimSlash(baseUrl);

  const buildHeaders = async (
    options: ApiRequestOptions = {},
    extras: Record<string, string> = {}
  ) => {
    const token = await getAccessToken();
    return {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.deviceId ? { "x-device-id": options.deviceId } : {}),
      ...extras,
      ...options.headers,
    };
  };

  const request = async (path: string, options: ApiRequestOptions = {}) => {
    const headers = await buildHeaders(options);
    const response = await fetch(`${root}${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ApiError(response.status, text || response.statusText);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  };

  /** Authenticated streaming ask — Phase 1 will parse the body incrementally. */
  const streamAsk = async (
    body: unknown,
    options: Omit<ApiRequestOptions, "body" | "method"> = {}
  ) => {
    const headers = await buildHeaders(options, {
      Accept: "text/plain, application/json",
      "Content-Type": "application/json",
    });

    const response = await fetch(`${root}${API_PATHS.ask}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ApiError(response.status, text || response.statusText);
    }

    return response;
  };

  return {
    request,
    streamAsk,
    paths: API_PATHS,
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
