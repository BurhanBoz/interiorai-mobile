import React, { Component, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
    errorInfo: string | null;
}

/**
 * Last-ditch catch-all for render-time crashes. Wraps the whole app so a
 * broken screen can't wedge the user on a blank view — they see a branded
 * error screen with a "Return home" escape hatch and the option to expand
 * the stack trace in dev.
 *
 * Sentry hook point: when a DSN is configured, forward the captured error
 * in {@link componentDidCatch}. We deliberately don't hard-depend on Sentry
 * yet (no DSN in this codebase) — adding a conditional is a one-line diff
 * when the user provisions one.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        const stack = info.componentStack ?? "";
        this.setState({ errorInfo: stack });
        // eslint-disable-next-line no-console
        console.error("[ErrorBoundary]", error, stack);
        // Hook for Sentry / Bugsnag / any crash reporter:
        //   Sentry.captureException(error, { contexts: { react: { componentStack: stack } } });
    }

    handleRestart = () => {
        this.setState({ error: null, errorInfo: null });
        router.replace("/(tabs)/gallery");
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#131313" }}>
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "center",
                        paddingHorizontal: 32,
                        paddingVertical: 48,
                    }}
                >
                    <View style={{ alignItems: "center", marginBottom: 24 }}>
                        <View
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                backgroundColor: "rgba(147,0,10,0.18)",
                                borderWidth: 1,
                                borderColor: "rgba(224,120,120,0.4)",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 24,
                            }}
                        >
                            <Ionicons name="alert-circle-outline" size={36} color="#E8A5A5" />
                        </View>
                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: "700",
                                color: "#E5E2E1",
                                fontFamily: "NotoSerif",
                                textAlign: "center",
                                marginBottom: 8,
                            }}
                        >
                            Something Went Wrong
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: "#998F84",
                                textAlign: "center",
                                lineHeight: 20,
                                maxWidth: 320,
                            }}
                        >
                            The app hit an unexpected error. You can return home and try
                            again — nothing was lost.
                        </Text>
                    </View>

                    {__DEV__ && this.state.error ? (
                        <View
                            style={{
                                backgroundColor: "rgba(28,27,27,0.9)",
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 24,
                                borderWidth: 1,
                                borderColor: "rgba(77,70,60,0.3)",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 11,
                                    letterSpacing: 1.5,
                                    textTransform: "uppercase",
                                    color: "#E0C29A",
                                    fontWeight: "700",
                                    marginBottom: 8,
                                }}
                            >
                                Dev Debug
                            </Text>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#E5E2E1",
                                    fontFamily: "Courier",
                                    marginBottom: 8,
                                }}
                            >
                                {this.state.error.message}
                            </Text>
                            {this.state.errorInfo ? (
                                <Text
                                    style={{
                                        fontSize: 10,
                                        color: "#998F84",
                                        fontFamily: "Courier",
                                        lineHeight: 14,
                                    }}
                                    numberOfLines={12}
                                >
                                    {this.state.errorInfo}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}

                    <Pressable onPress={this.handleRestart}>
                        <LinearGradient
                            colors={["#C4A882", "#A68A62"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                height: 54,
                                borderRadius: 14,
                                gap: 10,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    letterSpacing: 1.5,
                                    textTransform: "uppercase",
                                    color: "#3F2D11",
                                }}
                            >
                                Return Home
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="#3F2D11" />
                        </LinearGradient>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        );
    }
}
