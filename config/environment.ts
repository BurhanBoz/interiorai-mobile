type Environment = "development" | "production";

interface EnvironmentConfig {
    env: Environment;
    apiUrl: string;
    appName: string;
    enableLogging: boolean;
}

const env: EnvironmentConfig = {
    env: (process.env.EXPO_PUBLIC_ENV as Environment) ?? "development",
    apiUrl:
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080",
    appName:
        process.env.EXPO_PUBLIC_APP_NAME ?? "The Architectural Lens",
    enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === "true",
};

export const isDev = env.env === "development";
export const isProd = env.env === "production";

export default env;
