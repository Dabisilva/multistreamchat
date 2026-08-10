import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppFooter } from "./components/AppFooter";
import { MessageRow } from "./components/MessageRow";
import { PlatformIcon } from "./components/PlatformIcon";

import { DEFAULT_MESSAGE_STYLES } from "./utils/styleDefaults";
import "./style.css";

const DEMO_MESSAGES = [
  {
    id: "demo-1",
    userId: "u1",
    displayName: "Luna",
    displayColor: "#FF6B6B",
    text: "Boa live! 🔥",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: Date.now(),
    provider: "twitch" as const,
    channel: "demo",
    msgId: "m1",
  },
  {
    id: "demo-2",
    userId: "u2",
    displayName: "Rafa",
    displayColor: "#4ECDC4",
    text: "Manda salve",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: Date.now(),
    provider: "youtube" as const,
    channel: "demo",
    msgId: "m2",
  },
  {
    id: "demo-3",
    userId: "u3",
    displayName: "Kai",
    displayColor: "#53FC18",
    text: "Vim da Kick também kkkk",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: Date.now(),
    provider: "kick" as const,
    channel: "demo",
    msgId: "m3",
  },
  {
    id: "demo-4",
    userId: "u4",
    displayName: "Maya",
    displayColor: "#F59E0B",
    text: "kkkkkkkkkkkkkk",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: Date.now(),
    provider: "twitch" as const,
    channel: "demo",
    msgId: "m4",
  },
  {
    id: "demo-5",
    userId: "u5",
    displayName: "Jorge",
    displayColor: "#55079e",
    text: "Jorge",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: Date.now(),
    provider: "twitch" as const,
    channel: "demo",
    msgId: "m5",
  },
];

const PREVIEW_MESSAGE_STYLES = {
  ...DEFAULT_MESSAGE_STYLES,
  usernameFontSize: "13",
  messageFontSize: "13",
  messagePadding: "2",
  borderRadius: "4",
};

const ViewerPreview: React.FC = () => (
  <div className="flex items-center gap-2.5">
    {(
      [
        { platform: "twitch" as const, count: "1.2K" },
        { platform: "youtube" as const, count: "850" },
        { platform: "kick" as const, count: "340" },
      ] as const
    ).map(({ platform, count }) => (
      <div key={platform} className="flex items-center gap-1.5 shrink-0">
        <PlatformIcon platform={platform} size={14} branded />
        <span
          className="font-bold text-white text-[13px] leading-none tracking-wide"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}
        >
          {count}
        </span>
      </div>
    ))}
  </div>
);

const ProductPreview: React.FC = () => (
  <div className="relative w-full max-w-lg mx-auto animate-fade-in">
    {/* Mock stream frame — height grows with overlays so nothing clips */}
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.45)] min-h-[360px] bg-[radial-gradient(ellipse_at_30%_20%,#312e81_0%,#0f0f0f_55%,#000_100%)] flex flex-col">
      {/* Soft light blobs */}
      <div
        className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-purple-500/25 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-1/4 w-64 h-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"
        aria-hidden
      />

      {/* Top overlays */}
      <div className="relative z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="rounded-xl bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-2 shadow-lg max-w-[min(100%,220px)] overflow-hidden">
          <ViewerPreview />
        </div>
      </div>

      {/* Chat overlay */}
      <div className="relative z-10 p-3 pt-0">
        <div className="rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 p-2.5 w-full max-w-full overflow-hidden">
          <div className="flex flex-col gap-1 w-full min-w-0">
            {DEMO_MESSAGES.map((message, index) => (
              <div
                key={message.id}
                className="animate-fade-in min-w-0 max-w-full"
                style={{
                  animationDelay: `${index * 120}ms`,
                  animationFillMode: "both",
                }}
              >
                <MessageRow
                  message={message}
                  hideAfter={180}
                  onRemove={() => {}}
                  customStyles={PREVIEW_MESSAGE_STYLES}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <p className="text-center text-sm text-white/70 m-0 mt-3">
      Chat unificado + contagem de espectadores no OBS
    </p>
  </div>
);

const App: React.FC = () => {
  const navigate = useNavigate();

  // OAuth redirect URIs apontam para "/" — encaminha o callback para o dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("code") || params.has("error")) {
      navigate(`/home${window.location.search}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 font-sans">
      <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 px-5 py-10 lg:px-12 max-w-7xl mx-auto">
        {/* Copy */}
        <div className="w-full max-w-xl animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/logo.png"
              alt="MultiStreamChat"
              className="w-10 h-10 rounded-full"
            />
          </div>

          <h1 className="text-5xl md:text-4xl font-bold m-0 mb-4 text-white leading-tight drop-shadow-sm">
            MultiStreamChat
          </h1>
          <p className="text-lg text-white/90 m-0 mb-6 leading-relaxed">
            Unifique o chat e a contagem de espectadores da Twitch, Kick e
            YouTube em overlays prontos para o OBS.
          </p>

          <div className="bg-dark-bg-secondary/95 rounded-2xl border border-dark-border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <p className="text-dark-text-secondary m-0 mb-4 leading-relaxed text-base">
              O{" "}
              <strong className="text-dark-text-primary">
                MultiStreamChat
              </strong>{" "}
              é um aplicativo web gratuito para streamers que transmitem em
              várias plataformas ao mesmo tempo. Ele reúne, em um só lugar, o
              chat e a contagem de espectadores.
            </p>

            <p className="text-dark-text-secondary m-0 mb-2 text-base">
              A finalidade do app é permitir que você:
            </p>
            <ul className="m-0 mb-4 pl-5 flex flex-col gap-1.5 text-dark-text-secondary text-base leading-relaxed">
              <li>
                exiba um overlay de chat unificado (mensagens, emotes e badges)
                no OBS;
              </li>
              <li>
                mostre a contagem de espectadores das plataformas conectadas;
              </li>
              <li>
                personalize cores e fontes e gere uma URL pronta para a
                transmissão.
              </li>
            </ul>

            <p className="text-dark-text-muted m-0 mb-6 text-sm leading-relaxed">
              Você autentica as contas, configura o visual e copia a URL do
              widget. O app não envia mensagens em seu nome — apenas lê o chat e
              os dados necessários para os overlays.
            </p>

            <Link
              to="/home"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-white font-semibold text-base no-underline bg-gradient-to-br from-indigo-500 to-purple-600 hover:brightness-110 transition-[filter] shadow-lg w-full sm:w-auto"
            >
              Entrar
            </Link>
          </div>

          <div className="mt-2 [&_a]:text-white/80 [&_a:hover]:text-white [&_span]:text-white/40 [&_footer]:border-white/20">
            <AppFooter />
          </div>
        </div>

        {/* Visual */}
        <div className="w-full max-w-lg shrink-0">
          <ProductPreview />
        </div>
      </div>
    </div>
  );
};

export default App;
