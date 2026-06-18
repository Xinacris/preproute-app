interface ApiErrorResponse {
  message?: string;
  errors?: { msg?: string }[];
}

export const getErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: ApiErrorResponse } })?.response?.data;
  return data?.errors?.[0]?.msg || data?.message || fallback;
};
