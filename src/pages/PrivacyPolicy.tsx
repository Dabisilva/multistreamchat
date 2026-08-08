import React from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";

const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      lastUpdated="7 de agosto de 2026"
    >
      <section>
        <h2>1. Sobre o MultiStreamDB Chat</h2>
        <p>
          O MultiStreamDB Chat (“Aplicativo”, “nós”) é uma ferramenta web para
          streamers que exibe overlays de chat unificado e contagem de
          espectadores das plataformas Twitch, Kick e YouTube, geralmente
          utilizados em softwares de transmissão como o OBS.
        </p>
      </section>

      <section>
        <h2>2. Dados que coletamos</h2>
        <p>
          O Aplicativo opera principalmente no seu navegador. Os dados tratados
          dependem das plataformas que você conecta:
        </p>
        <ul>
          <li>
            <strong className="text-dark-text-primary">Twitch:</strong> tokens
            de acesso OAuth, identificadores de canal/usuário, e-mail associado
            à conta (quando concedido pelo escopo{" "}
            <code className="text-indigo-300 text-sm">user:read:email</code>) e
            informações básicas do perfil necessárias para ler o chat e badges.
          </li>
          <li>
            <strong className="text-dark-text-primary">YouTube:</strong> tokens
            OAuth e dados de canal/live necessários para ler o chat ao vivo e a
            contagem de espectadores, no escopo de leitura (
            <code className="text-indigo-300 text-sm">youtube.readonly</code>).
          </li>
          <li>
            <strong className="text-dark-text-primary">Kick:</strong> apenas o
            nome do canal informado por você; não há login OAuth com a Kick.
          </li>
          <li>
            <strong className="text-dark-text-primary">Preferências:</strong>{" "}
            configurações de aparência do overlay (cores, fontes, atrasos etc.),
            usadas para montar a URL do widget.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Como e onde armazenamos</h2>
        <p>
          Tokens, dados de sessão e preferências são armazenados localmente no
          seu navegador (por exemplo, via{" "}
          <code className="text-indigo-300 text-sm">localStorage</code> /{" "}
          <code className="text-indigo-300 text-sm">sessionStorage</code>). Não
          mantemos um banco de dados próprio com o conteúdo do seu chat ou com
          seus tokens de acesso.
        </p>
        <p>
          A URL do widget pode incluir parâmetros (canal, token, opções visuais)
          para funcionar como overlay. Quem tiver acesso a essa URL poderá usar
          a sessão correspondente — trate-a como informação sensível e não a
          compartilhe publicamente.
        </p>
      </section>

      <section>
        <h2>4. Finalidade do uso</h2>
        <p>Utilizamos os dados exclusivamente para:</p>
        <ul>
          <li>autenticar você nas plataformas escolhidas;</li>
          <li>
            exibir mensagens de chat, emotes, badges e cores de usuário em tempo
            real;
          </li>
          <li>consultar e exibir a contagem de espectadores;</li>
          <li>manter sua sessão e preferências de personalização no overlay.</li>
        </ul>
        <p>
          Não vendemos dados pessoais e não utilizamos os dados do chat para
          publicidade direcionada.
        </p>
      </section>

      <section>
        <h2>5. Serviços de terceiros</h2>
        <p>
          Ao conectar Twitch, YouTube ou Kick, você também fica sujeito às
          políticas dessas plataformas. O Aplicativo consome APIs e conexões em
          tempo real dessas empresas (e, quando aplicável, serviços de emotes
          como BTTV/FFZ) apenas para fornecer as funcionalidades descritas.
        </p>
      </section>

      <section>
        <h2>6. Cookies e rastreamento</h2>
        <p>
          O Aplicativo não utiliza cookies de rastreamento publicitário. Dados
          de autenticação e estado da sessão são guardados no armazenamento
          local do navegador para o funcionamento do login e do overlay.
        </p>
      </section>

      <section>
        <h2>7. Seus direitos e controle</h2>
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>
            encerrar a sessão pelas opções de sair (sign out) no painel do
            Aplicativo;
          </li>
          <li>
            limpar tokens e dados locais pelo próprio navegador (limpar dados do
            site);
          </li>
          <li>
            revogar o acesso do Aplicativo nas configurações de segurança /
            apps conectados da Twitch ou da conta Google/YouTube.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Segurança</h2>
        <p>
          Adotamos práticas razoáveis no lado do cliente (fluxo OAuth, tokens
          locais). Nenhum sistema é 100% seguro: proteja seu dispositivo, não
          compartilhe URLs de widget com tokens e desconecte-se em computadores
          compartilhados.
        </p>
      </section>

      <section>
        <h2>9. Menores de idade</h2>
        <p>
          O Aplicativo destina-se a usuários que possam legalmente utilizar as
          plataformas de streaming conectadas. Se você for menor de idade, use o
          serviço apenas com supervisão e conforme as regras dessas plataformas.
        </p>
      </section>

      <section>
        <h2>10. Alterações</h2>
        <p>
          Podemos atualizar esta Política periodicamente. A data no topo da
          página indica a versão vigente. O uso contínuo do Aplicativo após
          alterações constitui ciência dos novos termos desta Política.
        </p>
      </section>

      <section>
        <h2>11. Contato</h2>
        <p>
          Em caso de dúvidas sobre privacidade relacionadas ao MultiStreamDB
          Chat, utilize os canais de contato disponibilizados pelo mantenedor
          do projeto.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
