import { useEffect } from 'react';

function NotificationHandler() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (registration) => {
        // Verifica se já existe uma inscrição ativa
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          console.log('Inscrição já existente:', existingSubscription);
          return;
        }
        
        // Se não houver inscrição, cria uma nova
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BBH2oyhNjmKPnyR140S375tVHFM1wuSd7GW7ijm90Ja7NB2eX67YQRbDLVyW_QrLqiDpbIy9QecaBDC_K1AWCro'
        });
        
        // Envia a inscrição para o backend, usando o id_cliente salvo no localStorage (se houver)
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            id_cliente: localStorage.getItem('id_cliente') || null
          })
        });
      }).catch((error) => {
        console.error('Erro ao obter o service worker pronto:', error);
      });
    }
  }, []);

  return null;
}

export default NotificationHandler;