export const notificationService = {
  async sendNotification(_title: string, _message: string, _imageUrl?: string, _data?: any): Promise<boolean> {
    return false;
  },

  async notifyNewMovie(_movieTitle: string, _imageUrl?: string): Promise<boolean> {
    return false;
  },

  async notifyNewEpisode(_seriesTitle: string, _season: number, _episode: number, _imageUrl?: string): Promise<boolean> {
    return false;
  }
};
