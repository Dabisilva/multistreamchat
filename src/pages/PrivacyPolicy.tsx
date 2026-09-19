import React from "react";
import { LegalPageLayout } from "@/components/LegalPageLayout";

const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      lastUpdated="18 de setembro de 2026"
    >
      <section>
        <h2>1. Sobre o MultiStreamChat</h2>
        <p>
          O MultiStreamChat (“Aplicativo”, “nós”) é uma ferramenta web para
          streamers que exibe overlays de chat unificado e contagem de
          espectadores das plataformas Twitch, Kick e YouTube, geralmente
          utilizados em softwares de transmissão como o OBS. Esta Política
          descreve como o MultiStreamChat acessa, usa, armazena, compartilha e
          exclui dados, incluindo Google user data obtidos via APIs do
          Google/YouTube.
        </p>
      </section>

      <section>
        <h2>2. Dados do Google / YouTube que o Aplicativo acessa</h2>
        <p>
          Quando você autoriza o login com Google/YouTube, o MultiStreamChat{" "}
          <strong className="text-dark-text-primary">acessa</strong> Google user
          data necessários para as funcionalidades do overlay, incluindo:
        </p>
        <ul>
          <li>
            tokens OAuth (access token e, quando fornecido, refresh token);
          </li>
          <li>
            identificadores e informações básicas do canal/perfil YouTube
            (por exemplo, nome do canal e ID);
          </li>
          <li>
            mensagens do chat ao vivo e metadados associados necessários para
            exibir o overlay;
          </li>
          <li>
            contagem de espectadores / status de live, quando a função de
            contador de viewers estiver em uso.
          </li>
        </ul>
        <p>
          O acesso ocorre no escopo de leitura{" "}
          <code className="text-indigo-300 text-sm">
            https://www.googleapis.com/auth/youtube.readonly
          </code>
          . Não solicitamos escopos além do mínimo necessário para fornecer
          essas funcionalidades.
        </p>
      </section>

      <section>
        <h2>3. Outros dados que coletamos</h2>
        <p>
          O Aplicativo opera principalmente no seu navegador. Além dos dados do
          Google/YouTube, também podemos tratar:
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
        <h2>4. Como usamos Google user data</h2>
        <p>
          Usamos Google user data{" "}
          <strong className="text-dark-text-primary">
            exclusivamente para fornecer e melhorar as funcionalidades
            voltadas ao usuário
          </strong>{" "}
          do MultiStreamChat, a saber:
        </p>
        <ul>
          <li>autenticar sua sessão YouTube no Aplicativo;</li>
          <li>
            exibir mensagens do chat ao vivo, badges e informações do canal no
            overlay;
          </li>
          <li>consultar e exibir a contagem de espectadores;</li>
          <li>
            manter a sessão ativa (incluindo renovação do access token) e
            aplicar preferências de personalização do overlay.
          </li>
        </ul>
        <p>
          Não usamos Google user data para publicidade direcionada, anúncios
          personalizados, remarketing, venda a corretoras de dados, avaliação de
          crédito, empréstimos, criação de bancos de dados para revenda, nem para
          desenvolver, melhorar ou treinar modelos de IA/ML não personalizados.
        </p>
      </section>

      <section>
        <h2>5. Como e onde armazenamos</h2>
        <p>
          Tokens, dados de sessão e preferências — incluindo Google user data —
          são armazenados localmente no seu navegador (por exemplo, via{" "}
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
        <h2>
          6. Compartilhamento, transferência e divulgação de Google user data
        </h2>
        <p>
          <strong className="text-dark-text-primary">
            Nós não compartilhamos, não transferimos e não divulgamos Google
            user data (dados obtidos via APIs do Google/YouTube) com terceiros.
          </strong>{" "}
          Em especial:
        </p>
        <ul>
          <li>
            não vendemos, alugamos nem cedemos tokens OAuth, dados de canal,
            mensagens de chat ou contagens de espectadores do YouTube a
            anunciantes, corretoras de dados, revendedores de informação ou
            outros apps;
          </li>
          <li>
            não enviamos Google user data para servidores nossos de armazenamento
            permanente — o processamento ocorre no seu navegador;
          </li>
          <li>
            Google user data é usado somente no dispositivo do usuário para
            autenticar a sessão e chamar as APIs oficiais do Google/YouTube
            necessárias ao funcionamento do chat e do contador de viewers;
          </li>
          <li>
            a única “transferência” técnica é a comunicação direta do seu
            navegador com os serviços da Google/YouTube (por exemplo,{" "}
            <code className="text-indigo-300 text-sm">
              oauth2.googleapis.com
            </code>{" "}
            e{" "}
            <code className="text-indigo-300 text-sm">
              www.googleapis.com/youtube/v3
            </code>
            ) para obter ou renovar tokens e ler dados autorizados por você.
          </li>
        </ul>
        <p>
          Não transferimos Google user data a terceiros para fins distintos de
          fornecer ou melhorar as funcionalidades do Aplicativo. Podemos
          divulgar informações apenas se formos legalmente obrigados a fazê-lo
          por ordem judicial ou autoridade competente. Fora dessa hipótese
          excepcional, Google user data não é compartilhado com ninguém.
        </p>
      </section>

      <section>
        <h2>7. Retenção e exclusão de Google user data</h2>
        <p>
          Como o Aplicativo não mantém um backend com banco de dados de usuários,
          a retenção de Google user data ocorre no armazenamento local do seu
          navegador e, de forma temporária, na memória da página do overlay:
        </p>
        <ul>
          <li>
            <strong className="text-dark-text-primary">
              Dados de API do YouTube em cache:
            </strong>{" "}
            identificadores e metadados de canal obtidos via{" "}
            <code className="text-indigo-300 text-sm">channels.list</code>{" "}
            (por exemplo, ID, nome e URL de miniatura) são guardados no{" "}
            <code className="text-indigo-300 text-sm">localStorage</code> com
            data de obtenção. Esse cache é reutilizado enquanto estiver fresco.
            Se estiver ausente, corrompido, sem data ou com 25 dias ou mais, o
            Aplicativo descarta o cache e busca novamente na API do YouTube, ou
            remove os dados se a sessão não puder ser renovada. O Aplicativo não
            mantém esses dados de API indefinidamente.
          </li>
          <li>
            <strong className="text-dark-text-primary">
              Estatísticas ao vivo:
            </strong>{" "}
            a contagem de espectadores concorrentes é lida periodicamente da API
            (cerca de cada 45 segundos) e permanece apenas na memória da página.
            Não é gravada em{" "}
            <code className="text-indigo-300 text-sm">localStorage</code>,
            IndexedDB ou servidor. Se a live terminar, se a API estiver
            indisponível (incluindo cota) ou se a estatística ficar sem
            atualização bem-sucedida por mais de dois minutos, o valor deixa de
            ser exibido como corrente (o overlay trata como indisponível / 0).
          </li>
          <li>
            <strong className="text-dark-text-primary">Chat ao vivo:</strong>{" "}
            mensagens do live chat são mantidas só na memória da página, no
            máximo as 20 mais recentes, e cada mensagem é removida da tela após
            cerca de 180 segundos. Elas não sobrevivem a recarregar a página e
            não são enviadas a um backend nosso.
          </li>
          <li>
            <strong className="text-dark-text-primary">
              Credenciais OAuth:
            </strong>{" "}
            access token e, quando fornecido, refresh token ficam no{" "}
            <code className="text-indigo-300 text-sm">localStorage</code> para
            manter a sessão e renovar o access token enquanto a conta permanecer
            conectada. Tokens não são tratados como estatísticas da API e não
            são apagados automaticamente aos 30 dias; deixam de funcionar se o
            Google os revogar ou se você desconectar o YouTube.
          </li>
          <li>
            <strong className="text-dark-text-primary">Exclusão no app:</strong>{" "}
            você pode solicitar a exclusão a qualquer momento usando a opção de
            sair / desconectar o YouTube no painel do Aplicativo. Nesse caso,
            removemos imediatamente do navegador os dados locais relacionados
            (incluindo access token, refresh token, cache de canal e datas de
            expiração). Se a renovação do token falhar ou for recusada, a sessão
            YouTube também é encerrada e esses dados locais são apagados.
          </li>
          <li>
            <strong className="text-dark-text-primary">
              Exclusão pelo navegador:
            </strong>{" "}
            você também pode apagar todos os dados do site nas configurações do
            navegador (limpar armazenamento / cookies e dados do site), o que
            remove tokens e demais Google user data locais.
          </li>
          <li>
            <strong className="text-dark-text-primary">
              Revogação na conta Google:
            </strong>{" "}
            você pode revogar o acesso do Aplicativo a qualquer momento em{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            . Após a revogação, os tokens deixam de funcionar nas APIs do Google;
            recomendamos também desconectar no Aplicativo ou limpar os dados
            locais para concluir a exclusão no dispositivo.
          </li>
        </ul>
        <p>
          Depois da exclusão ou revogação, o Aplicativo deixa de acessar Google
          user data até que você autorize novamente o login.
        </p>
      </section>

      <section>
        <h2>8. Proteção e segurança de Google user data</h2>
        <p>
          Adotamos procedimentos de segurança para proteger a confidencialidade
          e a integridade dos dados, incluindo Google user data:
        </p>
        <ul>
          <li>
            autenticação via OAuth 2.0 com Google (incluindo PKCE quando
            aplicável), em vez de armazenar senhas da conta Google;
          </li>
          <li>
            comunicação com as APIs do Google/YouTube feita por HTTPS /
            conexões criptografadas;
          </li>
          <li>
            tokens e metadados de sessão guardados apenas no armazenamento local
            do navegador do usuário, sem banco de dados nosso de tokens;
          </li>
          <li>
            troca e renovação de tokens do YouTube feitas por um endpoint no
            próprio Aplicativo (
            <code className="text-indigo-300 text-sm">/api/youtube-token</code>
            ), para que o client secret do OAuth não seja incluído no JavaScript
            enviado ao navegador;
          </li>
          <li>
            escopo mínimo (
            <code className="text-indigo-300 text-sm">youtube.readonly</code>)
            e uso limitado às funcionalidades descritas nesta Política.
          </li>
        </ul>
        <p>
          Nenhum sistema é 100% seguro: proteja seu dispositivo, não compartilhe
          URLs de widget com tokens e desconecte-se em computadores
          compartilhados.
        </p>
      </section>

      <section>
        <h2>9. Serviços de terceiros</h2>
        <p>
          Ao conectar Twitch, YouTube ou Kick, você também fica sujeito às
          políticas dessas plataformas. O Aplicativo consome APIs e conexões em
          tempo real dessas empresas (e, quando aplicável, serviços de emotes
          como BTTV/FFZ) apenas para fornecer as funcionalidades descritas.
        </p>
        <p>
          O uso das APIs do Google/YouTube também está sujeito à{" "}
          <a
            href="https://www.google.com/policies/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade do Google
          </a>
          .
        </p>
      </section>

      <section>
        <h2>10. Cookies e rastreamento</h2>
        <p>
          O Aplicativo não utiliza cookies de rastreamento publicitário. Dados
          de autenticação e estado da sessão são guardados no armazenamento
          local do navegador para o funcionamento do login e do overlay.
        </p>
      </section>

      <section>
        <h2>11. Seus direitos e controle</h2>
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
        <h2>12. Menores de idade</h2>
        <p>
          O Aplicativo destina-se a usuários que possam legalmente utilizar as
          plataformas de streaming conectadas. Se você for menor de idade, use o
          serviço apenas com supervisão e conforme as regras dessas plataformas.
        </p>
      </section>

      <section>
        <h2>13. Alterações</h2>
        <p>
          Podemos atualizar esta Política periodicamente, inclusive se
          alterarmos a forma como o Aplicativo usa Google user data. A data no
          topo da página indica a versão vigente. O uso contínuo do Aplicativo
          após alterações constitui ciência dos novos termos desta Política.
        </p>
      </section>

      <section>
        <h2>14. Contato</h2>
        <p>
          Em caso de dúvidas sobre privacidade relacionadas ao MultiStreamChat,
          abra uma issue no repositório do projeto:{" "}
          <a
            href="https://github.com/Dabisilva/multistreamchat/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/Dabisilva/multistreamchat/issues
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
