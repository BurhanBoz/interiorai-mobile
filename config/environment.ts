type Environment = "development" | "production";

interface EnvironmentConfig {
    env: Environment;
    apiUrl: string;
    appName: string;
    enableLogging: boolean;
    google: {
        iosClientId: string;
        webClientId: string;
    };
}

const env: EnvironmentConfig = {
    env: (process.env.EXPO_PUBLIC_ENV as Environment) ?? "development",
    apiUrl:
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080",
    appName:
        process.env.EXPO_PUBLIC_APP_NAME ?? "Roomframe AI",
    enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === "true",
    google: {
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
    },
};

export const isDev = env.env === "development";
export const isProd = env.env === "production";

export default env;
