import { useEffect } from "react";
import "./Toast.css";

interface ToastProps {
    message: string;
    type: "success" | "error";
    onClose: () => void;
}

export const Toast = ({ message, type, onClose }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast toast-${type}`}>
            <div className="toast-content">
                <span className="toast-icon">
                    {type === "success" ? "✅" : "❌"}
                </span>
                <span className="toast-message">{message}</span>
                <button className="toast-close" onClick={onClose}>
                    ×
                </button>
            </div>
        </div>
    );
};

