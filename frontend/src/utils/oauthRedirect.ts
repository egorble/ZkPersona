// OAuth Redirect Handler with BroadcastChannel
// Following Gitcoin Passport pattern: waitForRedirect

export interface Platform {
  path: string;
  platformId: string;
}

export type ProviderPayload = {
  code: string;
  state: string;
  signature?: string;
};

/**
 * Wait for OAuth redirect using BroadcastChannel
 * Following Gitcoin Passport pattern for cross-window communication
 * 
 * This allows OAuth flow to work in a popup window without closing
 * the main application window.
 * 
 * @param platform - Platform instance with path property
 * @param timeout - Optional timeout in milliseconds (default: 5 minutes)
 * @returns Promise with provider payload (code, state)
 */
export const waitForRedirect = (
  platform: Platform,
  timeout: number = 1000 * 60 * 5 // 5 minutes default
): Promise<ProviderPayload> => {
  const channel = new BroadcastChannel(`${platform.path}_oauth_channel`);

  const waitForRedirect = new Promise<ProviderPayload>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Set timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        channel.close();
        reject(new Error(`OAuth redirect timeout after ${timeout}ms`));
      }, timeout);
    }

    // Listener to watch for OAuth redirect response from popup window
    function listenForRedirect(e: MessageEvent<{ target: string; data: ProviderPayload }>) {
      // When receiving OAuth response from popup, extract data
      if (e.data.target === platform.path) {
        const queryCode = e.data.data.code;
        const queryState = e.data.data.state;
        
        console.log('[OAuth] ✅ Received redirect data:', { 
          platform: platform.platformId,
          hasCode: !!queryCode,
          hasState: !!queryState
        });

        try {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          channel.close();
          
          resolve({
            code: queryCode,
            state: queryState,
            signature: e.data.data.signature
          });
        } catch (error) {
          console.error('[OAuth] ❌ Error processing redirect:', error);
          channel.close();
          reject(error);
        }
      }
    }

    // Event handler listens for messages from popup window
    channel.onmessage = listenForRedirect;

    // Handle channel errors
    channel.onerror = (error) => {
      console.error('[OAuth] ❌ BroadcastChannel error:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      channel.close();
      reject(new Error('BroadcastChannel communication error'));
    };
  });

  return waitForRedirect;
};

/**
 * Send OAuth redirect data to main window via BroadcastChannel
 * Called from OAuth callback page in popup window
 * 
 * @param platformPath - Platform path identifier (e.g., 'twitter', 'discord')
 * @param code - OAuth authorization code
 * @param state - OAuth state parameter
 * @param signature - Optional signature for EVM platforms
 */
export const sendOAuthRedirect = (
  platformPath: string,
  code: string,
  state: string,
  signature?: string
): void => {
  const channel = new BroadcastChannel(`${platformPath}_oauth_channel`);
  
  try {
    channel.postMessage({
      target: platformPath,
      data: {
        code,
        state,
        signature
      }
    });
    
    console.log('[OAuth] 📤 Sent redirect data via BroadcastChannel:', {
      platform: platformPath,
      hasCode: !!code,
      hasState: !!state
    });

    // Close channel after sending
    setTimeout(() => {
      channel.close();
      // Close popup window if possible
      if (window.opener) {
        window.close();
      }
    }, 100);
  } catch (error) {
    console.error('[OAuth] ❌ Error sending redirect:', error);
    channel.close();
  }
};

