import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function checkDriveApi() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const fileId = '1Se_r6Mi2OHiCdtJCGTMZ4LgrkWgKh--w'; // Novo ID fornecido pelo usuário

  if (!apiKey || apiKey === 'your_google_drive_api_key_here') {
    console.log('STATUS: Chave de API não configurada nos Secrets.');
    return;
  }

  console.log('Testando conexão com Google Drive API...');
  
  try {
    // Tenta apenas pegar os metadados básicos do arquivo para testar a chave e a ativação da API
    const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType&key=${apiKey}`);
    console.log('STATUS: API está ATIVADA e a chave é VÁLIDA.');
    console.log('Nome do arquivo:', response.data.name);
    console.log('MIME Type:', response.data.mimeType);
  } catch (error: any) {
    if (error.response) {
      const message = error.response.data?.error?.message || '';
      console.log(`ERRO DA API (${error.response.status}):`, message);
      
      if (message.includes('disabled') || message.includes('not been used')) {
        console.log('CONCLUSÃO: A Google Drive API NÃO está ativada no seu projeto Google Cloud.');
      } else if (message.includes('API key not valid')) {
        console.log('CONCLUSÃO: A sua API Key é INVÁLIDA.');
      } else if (error.response.status === 403) {
        console.log('CONCLUSÃO: Problema de permissão. Verifique se o arquivo está compartilhado como "Qualquer pessoa com o link".');
      }
    } else {
      console.log('ERRO DE CONEXÃO:', error.message);
    }
  }
}

checkDriveApi();
