export interface ReceiverDto {
event: string; // "webhookReceived"
  instanceId: string; 
  connectedPhone: string; 
  isGroup: boolean;
  messageId: string;
  fromMe: boolean;

  chat: {
    id: string; 
    profilePicture?: string;
  };

  sender: {
    id: string; 
    profilePicture?: string;
    pushName?: string;
    verifiedBizName?: string;
  };

  moment: number;
  msgContent: {
    extendedTextMessage?: {
      text?: string;
      contextInfo?: {
        ephemeralSettingTimestamp?: string;
        disappearingMode?: {
          initiator?: string;
          trigger?: string;
          initiatedByMe?: boolean;
        };
      };
      inviteLinkGroupTypeV2?: string;
    };

    conversation?: string;
    messageContextInfo?: {
      deviceListMetadata?: {
        senderKeyHash?: string;
        senderTimestamp?: string;
        senderAccountType?: string;
        receiverAccountType?: string;
        recipientKeyHash?: string;
        recipientTimestamp?: string;
      };
      deviceListMetadataVersion?: number;
      messageSecret?: string;
    };
  };
}