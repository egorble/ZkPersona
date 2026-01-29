// Aleo Program ID (v5: default stamps in initialize, claim_social_stamp)
// Deployed: zkpersona_passport_v5.aleo
// Deploy TX: at12s6clltped7kp8k4jwk3xyn89mh5edur2yaef3ewqp9gs3au3vpqtnszz6
// Override via VITE_PROGRAM_ID (e.g. your deployed program id) when set.
const _env = typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env;
export const PROGRAM_ID: string =
  (_env?.VITE_PROGRAM_ID as string) || "zkpersona_passport_v5.aleo";

