import React from "react";
import CustomRangeInput from "./CustomRangeInput";
import { ColorField } from "./ColorField";
import { MessageRow } from "./MessageRow";
import { toMessageStyles } from "../utils/styleDefaults";
import type { ChatCustomizationSettings } from "../utils/widgetUrl";

interface ChatCustomizationPanelProps {
  settings: ChatCustomizationSettings;
  onChange: <K extends keyof ChatCustomizationSettings>(
    key: K,
    value: ChatCustomizationSettings[K],
  ) => void;
}

export const ChatCustomizationPanel: React.FC<ChatCustomizationPanelProps> = ({
  settings,
  onChange,
}) => {
  const previewStyles = toMessageStyles(settings);

  return (
    <div className="flex gap-8 bg-dark-bg-card rounded-xl p-6 border border-dark-border">
      <div className="bg-dark-bg-primary rounded-xl p-6 border border-dark-border">
        <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">
          Opções de Personalização
        </h3>

        <div className="flex flex-col gap-4">
          <ColorField
            label="Cor de Fundo do Nome"
            color={settings.usernameBgColor}
            onColorChange={(value) => onChange("usernameBgColor", value)}
            alpha={settings.usernameBgAlpha}
            onAlphaChange={(value) => onChange("usernameBgAlpha", value)}
          />

          <div>
            <ColorField
              label="Cor de Fundo da Mensagem"
              color={settings.messageBgColor}
              onColorChange={(value) => onChange("messageBgColor", value)}
              alpha={settings.messageBgAlpha}
              onAlphaChange={(value) => onChange("messageBgAlpha", value)}
            />
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.fullWidthMessages}
                  onChange={(e) =>
                    onChange("fullWidthMessages", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-2 border-dark-border bg-dark-bg-secondary cursor-pointer accent-purple-500"
                />
                <span className="text-sm font-medium text-dark-text-secondary">
                  Mensagens com largura total
                </span>
              </label>
            </div>
          </div>

          <ColorField
            label="Cor do Texto da Mensagem"
            color={settings.messageColor}
            onColorChange={(value) => onChange("messageColor", value)}
            alpha={settings.messageColorAlpha}
            onAlphaChange={(value) => onChange("messageColorAlpha", value)}
          />

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Tamanho do Nome
            </label>
            <input
              type="number"
              min="12"
              max="32"
              value={settings.usernameFontSize}
              onChange={(e) => onChange("usernameFontSize", e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Tamanho da Mensagem
            </label>
            <input
              type="number"
              min="12"
              max="32"
              value={settings.messageFontSize}
              onChange={(e) => onChange("messageFontSize", e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Borda arredondada
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={settings.borderRadius}
              onChange={(e) => onChange("borderRadius", e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Espaçamento da Mensagem
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={settings.messagePadding}
              onChange={(e) => onChange("messagePadding", e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg-secondary border-2 border-dark-border rounded-lg text-sm text-dark-text-primary"
            />
          </div>

          <CustomRangeInput
            min={0}
            max={6}
            step={0.5}
            value={parseFloat(settings.messageDelay)}
            onChange={(value) => onChange("messageDelay", value.toString())}
            label={`Delay: ${settings.messageDelay}s (Mods, VIPs e dono do canal não são afetados)`}
          />
        </div>
      </div>

      <div className="bg-dark-bg-primary rounded-xl p-4 border border-dark-border h-[360px]">
        <h3 className="text-lg font-semibold mb-4 text-dark-text-primary">
          Preview
        </h3>
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg p-4">
          <div className="space-y-3 w-[400px]">
            <MessageRow
              message={{
                id: "preview-1",
                userId: "user1",
                displayName: "Jorge",
                displayColor: "#FF6B6B",
                text: "O maior de todos os tempos",
                badges: [],
                emotes: [],
                isAction: false,
                timestamp: Date.now(),
                provider: "twitch",
                channel: "example",
                msgId: "msg1",
              }}
              hideAfter={180}
              onRemove={() => {}}
              customStyles={previewStyles}
            />
            <MessageRow
              message={{
                id: "preview-2",
                userId: "user2",
                displayName: "Bruno",
                displayColor: "#4ECDC4",
                text: "A que não sei oq não sei oq lá",
                badges: [],
                emotes: [],
                isAction: false,
                timestamp: Date.now(),
                provider: "youtube",
                channel: "example",
                msgId: "msg2",
              }}
              hideAfter={180}
              onRemove={() => {}}
              customStyles={previewStyles}
            />
            <MessageRow
              message={{
                id: "preview-3",
                userId: "user3",
                displayName: "Alanzoka",
                displayColor: "#b927e6",
                text: "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
                badges: [],
                emotes: [],
                isAction: false,
                timestamp: Date.now(),
                provider: "kick",
                channel: "example",
                msgId: "msg3",
              }}
              hideAfter={180}
              onRemove={() => {}}
              customStyles={previewStyles}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
