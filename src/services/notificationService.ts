export const notificationService = {
  async sendNotification(title: string, message: string, imageUrl?: string, data?: any) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          message,
          imageUrl,
          data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Falha ao enviar notificação automática:', errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao chamar API de notificação:', error);
      return false;
    }
  },

  async notifyNewMovie(movieTitle: string, imageUrl?: string) {
    return this.sendNotification(
      '🎬 Novo Filme Adicionado!',
      `"${movieTitle}" já está disponível na sua biblioteca.`,
      imageUrl,
      { type: 'new_movie' }
    );
  },

  async notifyNewEpisode(seriesTitle: string, season: number, episode: number, imageUrl?: string) {
    return this.sendNotification(
      '📺 Novo Episódio Disponível!',
      `${seriesTitle} - T${season}:E${episode} foi adicionado.`,
      imageUrl,
      { type: 'new_episode' }
    );
  }
};
