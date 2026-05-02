import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function compareFiles() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const file1Id = '1Se_r6Mi2OHiCdtJCGTMZ4LgrkWgKh--w'; // O que NÃO funciona
  const file2Id = '18AjOPROa489xKvgY5dCeN_OyFgybZHSa'; // O que FUNCIONA

  if (!apiKey) {
    console.log('Erro: GOOGLE_DRIVE_API_KEY não configurada.');
    return;
  }

  const checkFile = async (id: string, label: string) => {
    console.log(`\n--- Verificando ${label} (ID: ${id}) ---`);
    try {
      // 1. Verificar metadados
      const metaRes = await axios.get(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType,size,capabilities&key=${apiKey}`);
      console.log('Metadados:', JSON.stringify(metaRes.data, null, 2));

      // 2. Tentar um "head" request no stream para ver o que o Google retorna
      const streamUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`;
      try {
        const streamRes = await axios.get(streamUrl, { 
          headers: { Range: 'bytes=0-100' },
          timeout: 5000 
        });
        console.log('Stream Status:', streamRes.status);
        console.log('Content-Type retornado:', streamRes.headers['content-type']);
        console.log('Content-Length retornado:', streamRes.headers['content-length']);
      } catch (err: any) {
        console.log('Erro ao tentar acessar stream:', err.response?.status || err.message);
        if (err.response?.data) {
          // Se for um erro de "arquivo muito grande para scan de vírus", o Google retorna um HTML
          const data = String(err.response.data);
          if (data.includes('confirm=') || data.includes('virus')) {
            console.log('AVISO: Este arquivo é muito grande e o Google exige confirmação manual para download (bloqueia API direta).');
          } else {
            console.log('Detalhes do erro:', data.substring(0, 200));
          }
        }
      }
    } catch (error: any) {
      console.log(`Erro ao buscar metadados:`, error.response?.status || error.message);
    }
  };

  await checkFile(file1Id, 'VÍDEO COM FALHA');
  await checkFile(file2Id, 'VÍDEO QUE FUNCIONA');
}

compareFiles();
