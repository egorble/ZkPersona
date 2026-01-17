import { useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { logger } from "../utils/logger";

export const useWalletEvents = () => {
    const { wallet, publicKey } = useWallet();

    useEffect(() => {
        if (!wallet?.adapter) return;

        const handleConnect = () => {
            if (publicKey) {
                logger.wallet.connected(publicKey);
            }
        };

        const handleDisconnect = () => {
            logger.wallet.disconnected();
        };

        wallet.adapter.on("connect", handleConnect);
        wallet.adapter.on("disconnect", handleDisconnect);

        return () => {
            wallet.adapter?.off("connect", handleConnect);
            wallet.adapter?.off("disconnect", handleDisconnect);
        };
    }, [wallet, publicKey]);
};

