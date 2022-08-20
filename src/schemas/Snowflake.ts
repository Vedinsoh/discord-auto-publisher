import z from 'zod';

const snowflakePattern = /^[0-9]{17,19}$/;
const isSnowflake = (value: string) => snowflakePattern.test(value);

export const Snowflake = z.string().refine(isSnowflake, (value) => ({
  message: `${value} is not a valid Discord snowflake`,
}));
