export interface DiscordUser {
  readonly id: string;
  readonly username: string;
  readonly globalName: string | null;
}

export interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline?: boolean;
}

export interface DiscordEmbed {
  readonly title?: string;
  readonly description?: string;
  readonly color?: number;
  readonly fields?: readonly DiscordEmbedField[];
  readonly image?: {
    readonly url: string;
  };
  readonly footer?: {
    readonly text: string;
  };
}

export interface DiscordButton {
  readonly type: 2;
  readonly style: 1 | 2 | 3 | 4 | 5;
  readonly label: string;
  readonly custom_id?: string;
  readonly url?: string;
  readonly disabled?: boolean;
  readonly emoji?: {
    readonly name?: string;
    readonly id?: string;
  };
}

export interface DiscordSelectMenuOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}

export interface DiscordSelectMenu {
  readonly type: 3;
  readonly custom_id: string;
  readonly placeholder?: string;
  readonly options: readonly DiscordSelectMenuOption[];
  readonly disabled?: boolean;
}

export interface DiscordActionRow {
  readonly type: 1;
  readonly components: readonly (DiscordButton | DiscordSelectMenu)[];
}

export interface DiscordInteractionResponse {
  readonly type: number; // 4 = ChannelMessageWithSource, 7 = UpdateMessage
  readonly data?: {
    readonly content?: string;
    readonly embeds?: readonly DiscordEmbed[];
    readonly components?: readonly DiscordActionRow[];
    readonly flags?: number; // 64 = Ephemeral
  };
}

export type ParsedInteraction =
  | { readonly _tag: "Ping" }
  | {
      readonly _tag: "Command";
      readonly commandName: string;
      readonly applicationId: string;
      readonly token: string;
      readonly user: DiscordUser;
      readonly options: Record<string, any>;
    }
  | {
      readonly _tag: "Component";
      readonly customId: string;
      readonly applicationId: string;
      readonly token: string;
      readonly user: DiscordUser;
      readonly values?: readonly string[];
    };
