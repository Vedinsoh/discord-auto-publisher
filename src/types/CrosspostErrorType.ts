export type CrosspostErrorType = {
  message: string;
  code?: number;
  global?: boolean;
  retry_after?: number;
};
