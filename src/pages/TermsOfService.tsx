import React from "react";
import { Link } from "react-router-dom";
import { LegalPageLayout } from "../components/LegalPageLayout";

const TermsOfService: React.FC = () => {
  return (
    <LegalPageLayout
      title="Termos de Serviço"
      lastUpdated="7 de agosto de 2026"
    >
      <section>
        <h2>1. Aceitação dos termos</h2>
        <p>
          Ao acessar ou utilizar o MultiStreamChat (“Aplicativo”), você
          concorda com estes Termos de Serviço. Se não concordar, não utilize o
          serviço.
        </p>
      </section>

      <section>
        <h2>2. Descrição do serviço</h2>
        <p>
          O Aplicativo oferece ferramentas para streamers, incluindo, entre
          outras:
        </p>
        <ul>
          <li>
            overlay de chat unificado com mensagens da Twitch, Kick e/ou
            YouTube;
          </li>
          <li>exibição de badges, emotes e cores de usuário quando disponíveis;</li>
          <li>widget de contagem de espectadores das plataformas conectadas;</li>
          <li>
            painel de personalização visual e geração de URL para uso em OBS ou
            softwares semelhantes.
          </li>
        </ul>
        <p>
          O serviço depende da disponibilidade e das regras das APIs e chats das
          plataformas de terceiros.
        </p>
      </section>

      <section>
        <h2>3. Contas e autenticação</h2>
        <p>
          Para Twitch e YouTube, o login é feito via OAuth nas respectivas
          plataformas. Você é responsável por manter a segurança da sua conta e
          por não compartilhar tokens, códigos de autorização ou URLs de widget
          que contenham credenciais.
        </p>
        <p>
          Para a Kick, basta informar o nome do canal; não há autenticação
          OAuth nessa plataforma neste Aplicativo.
        </p>
      </section>

      <section>
        <h2>4. Uso permitido</h2>
        <p>Você concorda em utilizar o Aplicativo apenas para:</p>
        <ul>
          <li>
            exibir o próprio chat / contagem de viewers em transmissões ou
            telas autorizadas;
          </li>
          <li>
            fins pessoais ou de produção de conteúdo compatíveis com os termos
            da Twitch, Kick, YouTube e demais serviços integrados.
          </li>
        </ul>
        <p>É proibido, entre outras condutas:</p>
        <ul>
          <li>
            usar o Aplicativo para spam, assédio, fraude ou violação de leis;
          </li>
          <li>
            tentar burlar limites das APIs, realizar engenharia reversiva
            abusiva ou sobrecarregar intencionalmente os serviços;
          </li>
          <li>
            redistribuir tokens de terceiros ou acessar canais sem autorização;
          </li>
          <li>
            apresentar o Aplicativo como produto oficial da Twitch, Kick,
            YouTube ou Google.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Plataformas de terceiros</h2>
        <p>
          Twitch, Kick, YouTube e Google são serviços independentes. O
          MultiStreamChat não é afiliado, endossado ou patrocinado por essas
          empresas, salvo indicação expressa em contrário. A interrupção,
          mudança de API ou restrição de acesso por parte delas pode afetar o
          funcionamento do Aplicativo sem que isso configure obrigação de
          indenização da nossa parte.
        </p>
      </section>

      <section>
        <h2>6. Disponibilidade e alterações</h2>
        <p>
          O Aplicativo é fornecido “como está” e “conforme disponível”. Podemos
          modificar, suspender ou descontinuar recursos a qualquer momento,
          inclusive por manutenção, atualizações ou limitações técnicas.
        </p>
      </section>

      <section>
        <h2>7. Isenção de garantias</h2>
        <p>
          Na máxima extensão permitida pela lei aplicável, não garantimos que o
          serviço será ininterrupto, livre de erros, livre de atrasos nas
          mensagens ou adequado a um propósito específico (por exemplo,
          sincronização milimétrica com o áudio da live).
        </p>
      </section>

      <section>
        <h2>8. Limitação de responsabilidade</h2>
        <p>
          Na medida permitida pela lei, o mantenedor do MultiStreamChat não
          se responsabiliza por danos indiretos, lucros cessantes, perda de
          dados, interrupção de transmissão ou qualquer prejuízo decorrente do
          uso ou da impossibilidade de uso do Aplicativo, inclusive falhas
          causadas por terceiros, pela rede ou pelo software de captura (OBS
          etc.).
        </p>
      </section>

      <section>
        <h2>9. Propriedade intelectual</h2>
        <p>
          O código, a marca “MultiStreamChat” e os elementos da interface
          pertencem aos seus respectivos titulares. Marcas e conteúdos das
          plataformas (Twitch, Kick, YouTube, emotes de terceiros etc.)
          pertencem aos seus proprietários e são usados apenas conforme
          necessário para a integração.
        </p>
      </section>

      <section>
        <h2>10. Privacidade</h2>
        <p>
          O tratamento de dados pessoais está descrito na{" "}
          <Link to="/privacy">Política de Privacidade</Link>. Ao usar o
          Aplicativo, você também declara ter lido esse documento.
        </p>
      </section>

      <section>
        <h2>11. Rescisão</h2>
        <p>
          Você pode deixar de usar o serviço a qualquer momento, desconectando
          as contas e limpando os dados locais. Podemos restringir o acesso em
          caso de violação destes Termos ou de abuso do serviço.
        </p>
      </section>

      <section>
        <h2>12. Alterações destes Termos</h2>
        <p>
          Podemos atualizar estes Termos periodicamente. A data no topo indica a
          versão vigente. O uso contínuo após a publicação das alterações
          implica aceitação da nova versão.
        </p>
      </section>

      <section>
        <h2>13. Contato</h2>
        <p>
          Dúvidas sobre estes Termos podem ser enviadas pelos canais de contato
          disponibilizados pelo mantenedor do projeto.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfService;
