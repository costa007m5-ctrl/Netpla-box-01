import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose403() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const fileId = '1Se_r6Mi2OHiCdtJCGTMZ4LgrkWgKh--w'; // O arquivo grande que está dando erro

  if (!apiKey) {
    console.log('Erro: GOOGLE_DRIVE_API_KEY não configurada.');
    return;
  }

  console.log(`\n--- Diagnosticando Erro 403 para o arquivo ${fileId} ---`);
  
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    
    const response = await axios.get(url, {
      headers: { Range: 'bytes=0-100' },
      validateStatus: () => true // Não joga erro para podermos ver o corpo da resposta
    });

    console.log('Status Code:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    
    if (typeof response.data === 'object') {
      console.log('Corpo da Resposta (JSON):', JSON.stringify(response.data, null, 2));
    } else {
      console.log('Corpo da Resposta (Texto/HTML):', String(response.data).substring(0, 500));
    }

    if (response.status === 403) {
      const data = typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data);
      
      if (data.includes('usageLimits') || data.includes('dailyLimitExceeded')) {
        console.log('\nCONCLUSÃO: Sua cota diária da API do Google Drive acabou.');
      } else if (data.includes('rateLimitExceeded')) {
        console.log('\nCONCLUSÃO: Muitas requisições em pouco tempo. Tente novamente em alguns minutos.');
      } else if (data.includes('downloadQuotaExceeded')) {
        console.log('\nCONCLUSÃO: O Google Drive bloqueou este arquivo específico porque ele foi baixado/assistido por muitas pessoas hoje. Isso é uma trava do próprio Google para arquivos populares.');
      } else if (data.includes('fileNotDownloadable')) {
        console.log('\nCONCLUSÃO: O dono do arquivo desativou a opção de download/cópia para este arquivo.');
      } else {
        console.log('\nCONCLUSÃO: Erro 403 genérico. Pode ser permissão do arquivo ou restrição da chave de API.');
      }
    }

  } catch (error: any) {
    console.log('Erro inesperado no diagnóstico:', error.message);
  }
}

diagnose403();
