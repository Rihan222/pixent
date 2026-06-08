import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, Animated, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: { progress?: number; autoHide?: boolean }) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; progress?: number } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim, slideAnim]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", options?: { progress?: number; autoHide?: boolean }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const autoHide = options?.autoHide ?? (type !== "info" || options?.progress === undefined);

      setToast({ message, type, progress: options?.progress });

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide if configured
      if (autoHide) {
        timerRef.current = setTimeout(() => {
          hideToast();
        }, 3000);
      }
    },
    [fadeAnim, slideAnim, hideToast]
  );

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <Feather name="check-circle" size={18} color="#10B981" />;
      case "error":
        return <Feather name="alert-circle" size={18} color="#EF4444" />;
      default:
        return <Feather name="info" size={18} color="#3B82F6" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "#10B981";
      case "error":
        return "#EF4444";
      default:
        return "#3B82F6";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + 12,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              borderLeftColor: getBorderColor(toast.type),
            },
          ]}
        >
          <View style={styles.contentRow}>
            <View style={styles.iconWrapper}>{getIcon(toast.type)}</View>
            <Text style={styles.toastText}>{toast.message}</Text>
            {toast.progress !== undefined && (
              <Text style={styles.progressText}>{Math.round(toast.progress)}%</Text>
            )}
          </View>
          
          {toast.progress !== undefined && (
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(Math.max(toast.progress, 0), 100)}%`,
                    backgroundColor: getBorderColor(toast.type),
                  }
                ]} 
              />
            </View>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#1A1A1E",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 4,
    zIndex: 9999,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    marginRight: 12,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  progressText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    marginTop: 10,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
