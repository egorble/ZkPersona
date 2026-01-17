import { useState, useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

export const useWalletErrors = () => {
    const { wallet } = useWallet();
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        if (!wallet?.adapter) return;

        const handleError = (error: Error) => {
            setToast({
                message: error.message || "An error occurred",
                type: "error",
            });
        };

        wallet.adapter.on("error", handleError);

        return () => {
            wallet.adapter?.off("error", handleError);
        };
    }, [wallet]);

    return { toast, setToast };
};

