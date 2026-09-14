import LegalPageLayout from './LegalPageLayout';

export default function Privacy() {
  return (
    <LegalPageLayout title="Política de Privacidade" updatedNote="Versão preliminar — em revisão jurídica.">
      <p>
        Este texto descreve, de forma resumida, quais dados o Marketfy coleta e para que eles
        são usados. Ele está em revisão pelo time jurídico e será substituído por uma versão
        completa, alinhada à Lei Geral de Proteção de Dados (LGPD), antes de ter força
        contratual definitiva.
      </p>

      <h2>Dados que coletamos</h2>
      <ul>
        <li>Dados de cadastro: nome, e-mail, CPF e senha (armazenada de forma criptografada).</li>
        <li>Dados operacionais que você registra no sistema: produtos, estoque, vendas, clientes e lançamentos financeiros da sua loja.</li>
        <li>Dados necessários para a emissão de notas fiscais (NFC-e), quando você configura o módulo fiscal.</li>
      </ul>

      <h2>Para que usamos</h2>
      <p>
        Usamos esses dados para operar o sistema (login, PDV, estoque, financeiro, emissão
        fiscal), para processar pagamentos de planos e créditos fiscais através de provedores
        de pagamento, e para dar suporte à sua conta.
      </p>

      <h2>Compartilhamento</h2>
      <p>
        Dados de pagamento são processados pelo provedor de pagamentos usado para a
        contratação do plano ou para a compra de créditos fiscais. Dados fiscais das vendas
        são enviados à SEFAZ do seu estado, como exige a emissão de NFC-e.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar a exportação ou a exclusão dos seus dados a qualquer momento,
        entrando em contato pelo suporte dentro do sistema.
      </p>
    </LegalPageLayout>
  );
}
