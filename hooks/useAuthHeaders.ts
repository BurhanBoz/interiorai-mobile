import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

/** Returns auth headers for authenticated image/file requests */
export function useAuthHeaders() {
    const [headers, setHeaders] = useState<Record<string, string>>({});

    useEffect(() => {
        SecureStore.getItemAsync("auth_token").then(token => {
            if (token) {
                setHeaders({ Authorization: `Bearer ${token}` });
            }
        });
    }, []);

    return headers;
}
