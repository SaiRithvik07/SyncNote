import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:5100/api'),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default('http://localhost:5100'),
});

// Since Next.js bundles client-side code, we validate public envs safely.
// If validation fails, we fall back to defaults or print a warning in the console.
const getEnv = () => {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  });

  if (!result.success) {
    console.warn('⚠️ Invalid client-side environment variables, using defaults:', result.error.format());
    return {
      NEXT_PUBLIC_API_URL: 'http://localhost:5100/api',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:5100',
    };
  }

  return result.data;
};

export const env = getEnv();
